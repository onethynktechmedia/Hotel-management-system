import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFileSync } from 'fs'
import { join } from 'path'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { billContent } = body

    if (!billContent) {
      return NextResponse.json({ error: 'No bill content provided' }, { status: 400 })
    }

    console.log('Print API called, content length:', billContent.length)

    // Check if printer is available
    try {
      const { stdout: printerStatus } = await execAsync('lpstat -p EC58B')
      console.log('Printer status:', printerStatus)
    } catch (statusError) {
      console.error('Printer not found or not accepting jobs:', statusError)
      return NextResponse.json({ 
        error: 'Printer EC58B not found or not accepting jobs. Please check printer connection.' 
      }, { status: 500 })
    }

    // Write bill content to a temporary file
    const tempFilePath = join('/tmp', `bill_${Date.now()}.txt`)
    writeFileSync(tempFilePath, billContent, 'binary')
    console.log('Bill content written to temp file:', tempFilePath)
    
    // Send file to CUPS printer using lp command
    const command = `lp -d EC58B -o raw "${tempFilePath}"`
    
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
      
      return NextResponse.json({ success: true, message: 'Print job submitted to EC58B' })
    } catch (execError) {
      console.error('Print command error:', execError)
      return NextResponse.json({ 
        error: 'Failed to execute print command. Please check printer connection and CUPS configuration.' 
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Print API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
