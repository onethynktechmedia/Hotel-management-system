import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { billContent } = await request.json()

    if (!billContent) {
      return NextResponse.json({ success: false, error: 'No bill content provided' }, { status: 400 })
    }

    // Write bill content to a temporary file
    const fs = require('fs').promises
    const path = require('path')
    const { exec } = require('child_process')
    const { promisify } = require('util')
    const execAsync = promisify(exec)

    const tempDir = '/tmp'
    const tempFile = path.join(tempDir, `bill_${Date.now()}.txt`)
    
    await fs.writeFile(tempFile, billContent, 'utf8')

    // Print using CUPS lp command
    // EC58B is the printer name configured in CUPS
    const printCommand = `lp -d EC58B "${tempFile}"`
    
    try {
      await execAsync(printCommand)
      
      // Clean up temp file after printing
      setTimeout(() => {
        fs.unlink(tempFile).catch(() => {})
      }, 5000)

      return NextResponse.json({ success: true, message: 'Bill sent to printer' })
    } catch (printError) {
      console.error('CUPS print error:', printError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to print via CUPS',
        details: (printError as Error).message
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Print API error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      details: (error as Error).message
    }, { status: 500 })
  }
}
