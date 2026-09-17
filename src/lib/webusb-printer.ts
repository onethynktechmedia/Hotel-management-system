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
  const printWindow = window.open('', '_blank', 'width=400,height=600')
  
  if (printWindow) {
    console.log('Print window created')
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
            .developer {
              font-size: 8px;
              line-height: 1.0;
            }
          </style>
        </head>
        <body>${plainText}</body>
      </html>
    `)
    printWindow.document.close()
    console.log('Print window content written')
    
    setTimeout(() => {
      console.log('Calling print() on window')
      printWindow.focus()
      printWindow.print()
    }, 500)
  } else {
    console.error('Failed to open print window - popup blocked')
    alert('Please allow popups for this site to enable printing')
  }
}
