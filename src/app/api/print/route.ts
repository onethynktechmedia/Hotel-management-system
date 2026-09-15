import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { billContent, printerName = 'EC58B' } = body

    if (!billContent) {
      return NextResponse.json({ error: 'No bill content provided' }, { status: 400 })
    }

    console.log('Print API called, content length:', billContent.length)

    // Check if we're in a serverless environment (Vercel, etc.)
    // Serverless environments don't support system commands for printing
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || !process.env.PRINTER_ENABLED) {
      console.log('Running in serverless environment or printer not enabled')
      return NextResponse.json({ 
        success: false, 
        message: 'Printing is not available in serverless environments. Please use browser print instead.',
        fallback: true,
        billContent: billContent
      }, { status: 200 })
    }

    // For local development with printer support
    try {
      const { exec } = await import('child_process')
      const { promisify } = await import('util')
      const { writeFileSync } = await import('fs')
      const { join } = await import('path')

      const execAsync = promisify(exec)

      // Check if printer is available
      try {
        const { stdout: printerStatus } = await execAsync(`lpstat -p ${printerName}`)
        console.log('Printer status:', printerStatus)
      } catch (statusError) {
        console.error('Printer not found or not accepting jobs:', statusError)
        return NextResponse.json({ 
          success: false,
          error: `Printer ${printerName} not found or not accepting jobs. Please check printer connection.`,
          fallback: true,
          billContent: billContent
        }, { status: 200 })
      }

      // Write bill content to a temporary file
      const tempFilePath = join('/tmp', `bill_${Date.now()}.txt`)
      writeFileSync(tempFilePath, billContent, 'binary')
      console.log('Bill content written to temp file:', tempFilePath)
      
      // Send file to CUPS printer using lp command
      const command = `lp -d ${printerName} -o raw "${tempFilePath}"`
      
      try {
        console.log('Executing print command:', command)
        const { stdout, stderr } = await execAsync(command)
        console.log(`Print job submitted: ${stdout}`)
        if (stderr) {
          console.log(`Print stderr: ${stderr}`)
        }
        
        // Clean up temp file
        try {
          await execAsync(`rm "${tempFilePath}"`)
        } catch (cleanupError) {
          console.error('Failed to clean up temp file:', cleanupError)
        }
        
        return NextResponse.json({ success: true, message: `Print job submitted to ${printerName}` })
      } catch (execError) {
        console.error('Print command error:', execError)
        return NextResponse.json({ 
          success: false,
          error: 'Failed to execute print command. Please check printer connection and CUPS configuration.',
          fallback: true,
          billContent: billContent
        }, { status: 200 })
      }
    } catch (importError) {
      console.error('Failed to import required modules:', importError)
      return NextResponse.json({ 
        success: false,
        error: 'Printing modules not available in this environment',
        fallback: true,
        billContent: billContent
      }, { status: 200 })
    }
  } catch (error) {
    console.error('Print API error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      fallback: true
    }, { status: 500 })
  }
}
