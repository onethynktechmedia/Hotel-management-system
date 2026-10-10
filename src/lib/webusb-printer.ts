// WebUSB Printer Utility for Direct USB Thermal Printing

export class WebUSBPrinter {
  private device: any = null
  private vendorId = 0x0456 // Everycom EC58B vendor ID
  private productId = 0x0808 // Everycom EC58B product ID

  async connect(silent: boolean = false): Promise<void> {
    try {
      // Check if WebUSB is supported (not supported on mobile)
      if (!navigator || !(navigator as any).usb) {
        throw new Error('WebUSB is not supported. Please use Chrome/Edge on desktop or use browser print.')
      }

      // First, try to get already authorized devices (no prompt)
      const devices = await (navigator as any).usb.getDevices()
      const existingDevice = devices.find((d: any) =>
        d.vendorId === this.vendorId && d.productId === this.productId
      )

      if (existingDevice) {
        // Use existing authorized device
        this.device = existingDevice
      } else if (!silent) {
        // Request USB device access (only if no authorized device found and not in silent mode)
        const device = await (navigator as any).usb.requestDevice({
          filters: [
            { vendorId: this.vendorId, productId: this.productId }
          ]
        })
        this.device = device
      } else {
        // Silent mode and no authorized device - fail silently
        throw new Error('No authorized printer found')
      }

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

// Silent print function - no popups, only prints if printer is already authorized
export async function printSilently(content: string, plainText: string): Promise<boolean> {
  try {
    const printer = new WebUSBPrinter()
    await printer.connect(true) // true = silent mode
    await printer.print(content)
    await printer.disconnect()
    console.log('Printed successfully via WebUSB (silent)')
    return true
  } catch (error) {
    console.log('Silent print failed (no authorized printer):', error)
    // Silently fail - don't show any popup
    return false
  }
}

// Generate ESC/POS commands for KOT
export function generateKOTESCPOS(order: any, items: any[], dishes: any[], table: any, foodType: string): string {
  let escpos = '\x1B\x40' // Initialize printer

  // Center align
  escpos += '\x1B\x61\x01'

  // Table number
  escpos += '\x1D\x21\x11' // Double height, double width
  escpos += `TABLE ${table?.table_number || 'N/A'}\n`
  escpos += '\x1D\x21\x00' // Normal size

  // KOT Type
  const kotType = foodType === 'veg' ? 'VEG' : foodType === 'nonveg' ? 'NON-VEG' : 'OTHER'
  escpos += `${kotType} KOT\n`
  escpos += '--------------------\n'

  // Left align
  escpos += '\x1B\x61\x00'

  // Time and Waiter
  const time = new Date(order.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  escpos += `Time: ${time} | Waiter: ${order.users?.name || 'N/A'}\n`
  escpos += '--------------------\n'

  // Items
  // Group items by dish_id
  const groupedItems = items.reduce((acc: any[], item) => {
    const existing = acc.find(i => i.dish_id === item.dish_id && i.dish_type === item.dish_type)
    if (existing) {
      existing.quantity += item.quantity
    } else {
      acc.push({ ...item, quantity: item.quantity })
    }
    return acc
  }, [])

  // Filter by food type
  const filteredItems = groupedItems.filter(item => {
    const dish = dishes.find(d => d.id === item.dish_id)
    if (foodType === 'veg') return dish?.food_type === 'veg'
    if (foodType === 'nonveg') return dish?.food_type === 'nonveg'
    return dish?.food_type !== 'veg' && dish?.food_type !== 'nonveg'
  })

  filteredItems.forEach(item => {
    const dish = dishes.find(d => d.id === item.dish_id)
    const name = dish?.marathi_name || dish?.name || 'Unknown'
    const qty = item.quantity
    const type = item.dish_type || 'Normal'

    escpos += `${name}\n`
    escpos += `  Qty: ${qty}  Type: ${type}\n`
  })

  // Note if present
  if (order.order_description) {
    escpos += '\x1B\x61\x00' // Left align
    escpos += `NOTE: ${order.order_description}\n`
    escpos += '--------------------\n'
  }

  // Cut paper
  escpos += '\x1D\x56\x00'

  return escpos
}

// Generate plain text for KOT (browser print fallback)
export function generateKOTPlainText(order: any, items: any[], dishes: any[], table: any, foodType: string): string {
  const kotType = foodType === 'veg' ? 'VEG' : foodType === 'nonveg' ? 'NON-VEG' : 'OTHER'
  const time = new Date(order.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  let plainText = `
<div style="text-align: center; margin-bottom: 8px;">
  <div style="font-size: 24px; font-weight: 900; color: #000;">TABLE ${table?.table_number || 'N/A'}</div>
  <div style="font-size: 16px; font-weight: bold; color: #000;">${kotType} KOT</div>
</div>
<div style="border-top: 2px dashed #000; margin: 4px 0;"></div>
<div style="margin: 4px 0; font-size: 12px; font-weight: bold; color: #000;">
  <div style="display: flex; justify-content: space-between;">
    <span>TIME:</span>
    <span>${time}</span>
  </div>
  <div style="display: flex; justify-content: space-between;">
    <span>WAITER:</span>
    <span>${order.users?.name || 'N/A'}</span>
  </div>
</div>
<div style="border-top: 2px dashed #000; margin: 4px 0;"></div>
<div style="font-size: 12px; font-weight: 900; margin: 4px 0; color: #000;">ITEMS</div>
<div style="border-top: 2px dashed #000; margin: 4px 0;"></div>
`

  items.forEach(item => {
    const dish = dishes.find(d => d.id === item.dish_id)
    const name = dish?.marathi_name || dish?.name || 'Unknown'
    const qty = item.quantity
    const type = item.dish_type || 'Normal'

    plainText += `
<div style="margin: 4px 0; font-size: 12px; font-weight: bold; color: #000;">
  <div style="font-size: 14px;">${name}</div>
  <div style="display: flex; justify-content: space-between; font-size: 11px;">
    <span>Qty: ${qty}</span>
    <span>Type: ${type}</span>
  </div>
</div>
`
  })

  if (order.order_description) {
    plainText += `
<div style="border-top: 2px dashed #000; margin: 4px 0;"></div>
<div style="margin: 4px 0; font-size: 12px; font-weight: bold; color: #000;">
  NOTE: ${order.order_description}
</div>
`
  }

  plainText += `
<div style="border-top: 2px dashed #000; margin: 4px 0;"></div>
`

  return plainText
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
            font-size: 18px;
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
          .logo-container {
            text-align: center;
            margin-bottom: 4mm;
          }
          .logo-container img {
            width: 120px;
            height: auto;
            max-width: 100%;
          }
          .header {
            font-size: 22px;
            font-weight: 900;
            margin-bottom: 2mm;
            display: block;
          }
          .grand-total {
            font-size: 24px;
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
              font-size: 17px;
              line-height: 1.3;
            }
          }
          @media (max-width: 768px) {
            body {
              font-size: 14px;
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
