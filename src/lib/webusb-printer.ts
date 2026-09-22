// WebUSB Printer Utility for Direct USB Thermal Printing

export class WebUSBPrinter {
  private device: any = null
  private vendorId = 0x0456 // Everycom EC58B vendor ID
  private productId = 0x0808 // Everycom EC58B product ID

  async connect(): Promise<void> {
    try {
      // Check if WebUSB is supported (not supported on mobile)
      if (!navigator || !(navigator as any).usb) {
        throw new Error('WebUSB is not supported. Please use Chrome/Edge on desktop or use browser print.')
      }

      // Request USB device access
      const device = await (navigator as any).usb.requestDevice({
        filters: [
          { vendorId: this.vendorId, productId: this.productId }
        ]
      })

      this.device = device

      // Open the device
      await this.device.open()

      // Select configuration
      await this.device.selectConfiguration(1)

      // Claim interface
      await this.device.claimInterface(0)

      console.log('USB printer connected successfully')
    } catch (error: any) {
      console.error('Failed to connect to USB printer:', error)
      
      // Provide specific error messages
      if (error.name === 'NotFoundError') {
        throw new Error('Printer not found. Please ensure the printer is connected via USB and powered on.')
      } else if (error.name === 'SecurityError') {
        throw new Error('Permission denied. Please allow USB device access when prompted.')
      } else if (error.name === 'NotAllowedError') {
        throw new Error('User cancelled the device selection. Please try again and select the printer.')
      } else {
        throw new Error(`Connection failed: ${error.message || 'Unknown error'}`)
      }
    }
  }

  async print(content: string): Promise<void> {
    if (!this.device) {
      throw new Error('Printer not connected')
    }

    try {
      const encoder = new TextEncoder()
      const data = encoder.encode(content)

      // Send data to printer
      await this.device.transferOut(1, data)

      console.log('Data sent to printer successfully')
    } catch (error) {
      console.error('Failed to send data to printer:', error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    if (this.device) {
      try {
        await this.device.close()
        this.device = null
        console.log('USB printer disconnected')
      } catch (error) {
        console.error('Failed to disconnect printer:', error)
      }
    }
  }
}

// Print function with automatic fallback based on device type
export async function printWithFallback(content: string, plainText: string): Promise<void> {
  // Always try WebUSB first (works on desktop)
  try {
    const printer = new WebUSBPrinter()
    await printer.connect()
    await printer.print(content)
    await printer.disconnect()
    console.log('Printed successfully via WebUSB')
  } catch (error) {
    console.log('WebUSB failed, falling back to browser print:', error)
    // Fallback to browser print
    openBrowserPrint(plainText)
  }
}

// Browser print function with responsive sizing
function openBrowserPrint(plainText: string): void {
  console.log('Opening browser print dialog...')
  
  // Create a hidden iframe to print from
  const iframe = document.createElement('iframe')
  iframe.style.display = 'none'
  document.body.appendChild(iframe)
  
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
  if (!iframeDoc) {
    console.error('Failed to access iframe document')
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
            @page :left {
              margin: 0;
            }
            @page :right {
              margin: 0;
            }
            body {
              margin: 0;
              padding: 2mm;
              width: 58mm;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            * {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
          * {
            box-sizing: border-box;
          }
          body {
            font-family: 'Courier New', 'Consolas', 'Lucida Console', monospace;
            font-size: 14px;
            font-weight: bold;
            line-height: 1.4;
            margin: 0;
            padding: 2mm;
            text-align: center;
            width: 54mm;
            max-width: 54mm;
            overflow: hidden;
            background: white;
            color: black;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            image-rendering: crisp-edges;
          }
          .header {
            font-size: 18px;
            font-weight: 900;
            margin-bottom: 2mm;
            display: block;
          }
          .grand-total {
            font-size: 18px;
            font-weight: 900;
            margin: 2mm 0;
            display: block;
          }
          .developer {
            font-size: 8px;
            font-weight: normal;
            margin-top: 2mm;
            display: block;
          }
          @media print {
            body {
              font-size: 13px;
              line-height: 1.3;
            }
          }
          @media (max-width: 768px) {
            body {
              font-size: 12px;
              line-height: 1.3;
            }
          }
          /* Windows-specific fixes */
          @media screen and (-ms-high-contrast: active), (-ms-high-contrast: none) {
            body {
              font-size: 13px;
              line-height: 1.3;
            }
          }
        </style>
      </head>
      <body>${plainText}</body>
    </html>
  `)
  iframeDoc.close()
  
  console.log('Print content written to iframe')
  
  setTimeout(() => {
    console.log('Calling print() on iframe')
    iframe.contentWindow?.print()
    
    // Clean up iframe after printing
    setTimeout(() => {
      document.body.removeChild(iframe)
    }, 1000)
  }, 500)
}
