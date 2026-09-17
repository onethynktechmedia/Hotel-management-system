// WebUSB Thermal Printer Utility
// This handles direct communication with USB thermal printers in production

export interface WebUSBPrinterOptions {
  vendorId?: number
  productId?: number
}

export class WebUSBPrinter {
  private device: any = null
  private vendorId: number
  private productId: number

  constructor(options: WebUSBPrinterOptions = {}) {
    // Default vendor ID for common thermal printers (Everycom EC58)
    this.vendorId = options.vendorId || 0x0456
    this.productId = options.productId || 0x0805
  }

  async connect(): Promise<boolean> {
    try {
      // Check if WebUSB is supported
      if (!navigator || !(navigator as any).usb) {
        throw new Error('WebUSB is not supported in this browser. Please use Chrome or Edge.')
      }

      // Check if device is already connected
      const devices = await (navigator as any).usb.getDevices()
      const existingDevice = devices.find((d: any) => d.vendorId === this.vendorId)
      
      if (existingDevice) {
        this.device = existingDevice
        await this.device.open()
        await this.device.selectConfiguration(1)
        await this.device.claimInterface(0)
        console.log('USB printer reconnected successfully')
        return true
      }

      // Request device access with user permission
      this.device = await (navigator as any).usb.requestDevice({
        filters: [{ vendorId: this.vendorId }]
      })

      // Open the device
      await this.device.open()
      
      // Select configuration (usually configuration 1)
      await this.device.selectConfiguration(1)
      
      // Claim interface (usually interface 0)
      await this.device.claimInterface(0)

      console.log('USB printer connected successfully')
      return true
    } catch (error: any) {
      console.error('Failed to connect to USB printer:', error)
      
      if (error.name === 'SecurityError' || error.message?.includes('Access denied')) {
        throw new Error('USB access denied. Please allow USB access when prompted by the browser.')
      }
      
      throw error
    }
  }

  async print(escposContent: string): Promise<boolean> {
    if (!this.device) {
      throw new Error('Printer not connected. Call connect() first.')
    }

    try {
      // Convert string to Uint8Array
      const encoder = new TextEncoder()
      const data = encoder.encode(escposContent)

      // Send data to printer
      await this.device.transferOut(1, data)

      console.log('Print job sent successfully')
      return true
    } catch (error) {
      console.error('Failed to print:', error)
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

  isConnected(): boolean {
    return this.device !== null
  }
}

// Helper function to print directly without managing connection
export async function printToUSBPrinter(escposContent: string): Promise<boolean> {
  const printer = new WebUSBPrinter()
  
  try {
    await printer.connect()
    await printer.print(escposContent)
    await printer.disconnect()
    return true
  } catch (error: any) {
    console.error('USB printing failed:', error.message)
    return false
  }
}

// Fallback to browser print if WebUSB fails
export async function printWithFallback(escposContent: string, plainTextContent: string): Promise<void> {
  const usbSuccess = await printToUSBPrinter(escposContent)
  
  if (!usbSuccess) {
    console.log('WebUSB failed, falling back to browser print')
    
    // Show alert to user about fallback
    alert('USB printer not connected or access denied. Using browser print instead.\n\nTo use USB printing:\n1. Connect printer via USB\n2. Allow browser USB access when prompted\n3. Use Chrome or Edge browser')
    
    const printWindow = window.open('', '_blank', 'width=400,height=600')
    
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Print Bill</title>
            <style>
              body { 
                font-family: 'Courier New', monospace; 
                white-space: pre; 
                padding: 20px; 
                text-align: center;
                font-size: 12px;
                line-height: 1.4;
              }
              @media print { 
                body { font-size: 10px; }
                @page { margin: 5mm; }
              }
            </style>
          </head>
          <body>${plainTextContent}</body>
        </html>
      `)
      printWindow.document.close()
      
      setTimeout(() => {
        printWindow.print()
        printWindow.close()
      }, 250)
    } else {
      alert('Please allow popups for this site to enable printing')
    }
  }
}
