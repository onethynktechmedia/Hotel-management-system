import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json()

    if (!content) {
      return NextResponse.json({ error: 'No content provided' }, { status: 400 })
    }

    console.log('Print request received')

    // Format content for thermal printer with proper font settings
    // Use CUPS options for better thermal printing
    const escapedContent = content.replace(/'/g, "'\\''")
    
    // CUPS options for thermal printing:
    // -o raw: Send raw data to printer
    // -o cpi=12: Characters per inch (12 is standard for 58mm)
    // -o lpi=8: Lines per inch
    // -o orientation-requested=3: Portrait mode
    const command = `echo '${escapedContent}' | lp -d EC58 -o cpi=12 -o lpi=8 -o orientation-requested=3`
    
    console.log('Executing print command')
    await execAsync(command)
    console.log('Print job sent successfully')
    
    return NextResponse.json({ success: true, message: 'Print job sent to printer' })
  } catch (error) {
    console.error('Print API error:', error)
    return NextResponse.json({ error: 'Failed to print', details: String(error) }, { status: 500 })
  }
}
