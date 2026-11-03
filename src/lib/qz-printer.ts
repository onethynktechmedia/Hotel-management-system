/**
 * QZ Tray Printer Service for Direct, Silent Receipt Printing
 *
 * This service provides direct printing to thermal receipt printers using QZ Tray.
 * It eliminates the Chrome print preview dialog and enables silent printing.
 *
 * IMPORTANT: Secure Configuration Required
 * ========================================
 * QZ Tray requires cryptographic signing for production use. This prevents
 * unauthorized websites from printing to your printers.
 *
 * SETUP INSTRUCTIONS:
 * ===================
 *
 * 1. Install QZ Tray on the computer where the printer is connected:
 *    - Windows: Download from https://qz.io/download/
 *    - Linux: Install from https://qz.io/download/
 *    - Start QZ Tray application
 *
 * 2. Generate QZ Tray certificates:
 *    - Open QZ Tray
 *    - Go to Settings > Certificates
 *    - Generate a new certificate (public/private key pair)
 *    - Save the private key securely (NEVER commit to git)
 *    - Note the certificate ID
 *
 * 3. Create a Supabase Edge Function for secure signing:
 *    - Create supabase/functions/sign-qz/index.ts
 *    - Configure it with your private key
 *    - Deploy the function
 *
 * 4. Configure environment variables:
 *    - NEXT_PUBLIC_QZ_CERT_ID: Your certificate ID from QZ Tray
 *    - NEXT_PUBLIC_QZ_SIGNING_URL: Your Supabase Edge Function URL
 *
 * ALTERNATIVE: Development Mode (NOT FOR PRODUCTION)
 * ================================================
 * For development without signing, you can disable security checks in QZ Tray:
 * - This is INSECURE and should NEVER be used in production
 * - Only for testing on your local machine
 * - Configure in QZ Tray Settings > Security
 *
 * PRINTER CONFIGURATION:
 * =====================
 * - Install printer drivers on the computer
 * - Configure printer in Windows/Linux settings
 * - Note the exact printer name (case-sensitive)
 * - Set as default printer or configure in this service
 *
 * COMPATIBILITY:
 * =============
 * - Windows: Full support via QZ Tray
 * - Linux: Full support via QZ Tray
 * - macOS: Full support via QZ Tray
 * - Mobile/Web: Fallback to browser print (no QZ Tray)
 */

import qz from 'qz-tray'

export interface PrinterConfig {
  name: string // Exact printer name from system
  isDefault?: boolean
}

export interface PrintOptions {
  silent?: boolean // If true, don't show print dialog
  copies?: number // Number of copies to print
}

export class QZPrinter {
  private connected: boolean = false
  private config: PrinterConfig | null = null
  private certId: string = process.env.NEXT_PUBLIC_QZ_CERT_ID || ''
  private signingUrl: string = process.env.NEXT_PUBLIC_QZ_SIGNING_URL || ''

  /**
   * Connect to QZ Tray
   */
  async connect(): Promise<void> {
    try {
      if (!qz.websocket.isActive()) {
        // Start QZ Tray connection
        await qz.websocket.connect()
        this.connected = true
        console.log('QZ Tray connected successfully')
      }
    } catch (error) {
      console.error('Failed to connect to QZ Tray:', error)
      throw new Error(
        'QZ Tray is not running. Please ensure QZ Tray is installed and running on this computer.'
      )
    }
  }

  /**
   * Disconnect from QZ Tray
   */
  async disconnect(): Promise<void> {
    try {
      if (this.connected && qz.websocket.isActive()) {
        await qz.websocket.disconnect()
        this.connected = false
        console.log('QZ Tray disconnected')
      }
    } catch (error) {
      console.error('Failed to disconnect from QZ Tray:', error)
    }
  }

  /**
   * Get list of available printers
   */
  async getPrinters(): Promise<string[]> {
    try {
      await this.connect()
      const printers = await qz.printers.find()
      return printers
    } catch (error) {
      console.error('Failed to get printers:', error)
      throw error
    }
  }

  /**
   * Configure printer to use
   */
  setPrinter(config: PrinterConfig): void {
    this.config = config
    console.log('Printer configured:', config.name)
  }

  /**
   * Print HTML content
   */
  async printHTML(html: string, options: PrintOptions = {}): Promise<void> {
    try {
      if (!this.config) {
        throw new Error('No printer configured. Call setPrinter() first.')
      }

      await this.connect()

      // Configure print settings
      const config = qz.configs.create(this.config.name)

      // Print options
      const printOpts = {
        ...options,
        copies: options.copies || 1,
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        size: { width: '58mm', height: 'auto' }, // Standard thermal receipt width
        colorType: 'monochrome',
        interpolation: 'nearest-neighbor',
      }

      // Set security signing if configured
      if (this.certId && this.signingUrl) {
        await this.setupSigning()
      }

      // Print the HTML
      await qz.print(config, { html }, printOpts)

      console.log('Print job sent successfully')
    } catch (error) {
      console.error('Print failed:', error)
      throw error
    }
  }

  /**
   * Print ESC/POS commands (for direct thermal printing)
   */
  async printESCPOS(data: string, options: PrintOptions = {}): Promise<void> {
    try {
      if (!this.config) {
        throw new Error('No printer configured. Call setPrinter() first.')
      }

      await this.connect()

      // Configure print settings for raw printing
      const config = qz.configs.create(this.config.name)

      // Set security signing if configured
      if (this.certId && this.signingUrl) {
        await this.setupSigning()
      }

      // Print raw ESC/POS data
      await qz.print(config, [data])

      console.log('ESC/POS print job sent successfully')
    } catch (error) {
      console.error('ESC/POS print failed:', error)
      throw error
    }
  }

  /**
   * Setup cryptographic signing
   * This calls the Supabase Edge Function to sign requests
   */
  private async setupSigning(): Promise<void> {
    try {
      // Configure QZ Tray to use our signing endpoint
      qz.security.setSignaturePromise((toSign: string) => {
        return fetch(this.signingUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            toSign,
            certId: this.certId,
          }),
        })
          .then((response) => response.json())
          .then((data) => data.signature)
      })

      console.log('QZ Tray signing configured')
    } catch (error) {
      console.error('Failed to setup signing:', error)
      throw new Error('Failed to configure secure signing. Check your signing endpoint.')
    }
  }

  /**
   * Check if QZ Tray is available
   */
  static isAvailable(): boolean {
    return typeof qz !== 'undefined'
  }
}

// Singleton instance
let printerInstance: QZPrinter | null = null

export function getQZPrinter(): QZPrinter {
  if (!printerInstance) {
    printerInstance = new QZPrinter()
  }
  return printerInstance
}

/**
 * Print bill with automatic fallback
 * Tries QZ Tray first, falls back to browser print if unavailable
 */
export async function printBillWithFallback(
  html: string,
  plainText: string,
  printerConfig?: PrinterConfig
): Promise<boolean> {
  // Try QZ Tray first
  if (QZPrinter.isAvailable()) {
    try {
      const printer = getQZPrinter()

      if (printerConfig) {
        printer.setPrinter(printerConfig)
      }

      await printer.printHTML(html, { silent: true })
      await printer.disconnect()

      console.log('Bill printed via QZ Tray')
      return true
    } catch (error) {
      console.error('QZ Tray printing failed, falling back to browser print:', error)
      // Fall through to browser print
    }
  }

  // Fallback to browser print
  openBrowserPrint(plainText)
  return false
}

/**
 * Open browser print dialog (fallback)
 */
function openBrowserPrint(plainText: string): void {
  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  document.body.appendChild(iframe)

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
  if (!iframeDoc) {
    alert('Printing failed: Could not create print window')
    return
  }

  iframeDoc.write(`
    <html>
      <head>
        <title>Bill Print</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          @page {
            size: 58mm auto;
            margin: 0;
          }
          @media print {
            @page {
              size: 58mm auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 2mm;
              width: 58mm;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
          body {
            font-family: 'Courier New', monospace;
            font-size: 18px;
            font-weight: bold;
            line-height: 1.4;
            margin: 0;
            padding: 2mm;
            text-align: center;
            width: 54mm;
            background: white;
            color: black;
          }
        </style>
      </head>
      <body>${plainText}</body>
    </html>
  `)
  iframeDoc.close()

  setTimeout(() => {
    iframe.contentWindow?.print()
    setTimeout(() => {
      document.body.removeChild(iframe)
    }, 1000)
  }, 500)
}
