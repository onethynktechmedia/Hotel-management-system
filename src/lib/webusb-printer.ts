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
    } catch (error) {
      console.error('Failed to connect to USB printer:', error)
      throw error
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
  // Detect if mobile device
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
  
  if (isMobile) {
    // Mobile: Use browser print directly (WebUSB not supported on mobile)
    console.log('Mobile device detected, using browser print')
    openBrowserPrint(plainText)
  } else {
    // Desktop: Try WebUSB first, fallback to browser print
    try {
      const printer = new WebUSBPrinter()
      await printer.connect()
      await printer.print(content)
      await printer.disconnect()
    } catch (error) {
      console.log('WebUSB failed, falling back to browser print:', error)
      openBrowserPrint(plainText)
    }
  }
}

// Browser print function with responsive sizing
function openBrowserPrint(plainText: string): void {
  const printWindow = window.open('', '_blank', 'width=400,height=600')
  
  if (printWindow) {
    printWindow.document.write(`
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
                padding: 3mm;
                width: 58mm;
              }
            }
            * {
              box-sizing: border-box;
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.3;
              white-space: pre;
              margin: 0;
              padding: 3mm;
              text-align: center;
              width: 52mm;
              max-width: 52mm;
              overflow: hidden;
            }
            @media print {
              body {
                font-size: 11px;
                line-height: 1.2;
              }
            }
            @media (max-width: 768px) {
              body {
                font-size: 10px;
                line-height: 1.2;
              }
            }
          </style>
        </head>
        <body>${plainText}</body>
      </html>
    `)
    printWindow.document.close()
    
    setTimeout(() => {
      printWindow.focus()
      printWindow.print()
    }, 500)
  }
}
