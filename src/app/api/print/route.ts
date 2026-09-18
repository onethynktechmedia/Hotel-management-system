import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFileSync, unlinkSync } from 'fs'
import { join } from 'path'

const execAsync = promisify(exec)

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json()

    if (!content) {
      return NextResponse.json({ error: 'No content provided' }, { status: 400 })
    }

    console.log('Print request received, content length:', content.length)

    // Create a temporary file with the content
    const tempFilePath = join('/tmp', `print-${Date.now()}.txt`)
    writeFileSync(tempFilePath, content)

    try {
      // Print using CUPS (server-side printing)
      // This uses the configured EC58 printer
      const command = `lp -d EC58 "${tempFilePath}"`
      console.log('Executing print command:', command)
      
      await execAsync(command)
      console.log('Print job sent successfully')
      
      // Clean up temp file
      unlinkSync(tempFilePath)
      
      return NextResponse.json({ success: true, message: 'Print job sent to printer' })
    } catch (printError) {
      console.error('CUPS print error:', printError)
      
      // Clean up temp file
      try {
        unlinkSync(tempFilePath)
      } catch (e) {
        console.error('Error cleaning temp file:', e)
      }
      
      // Fallback: Try EC58B printer
      try {
        const fallbackCommand = `lp -d EC58B "${tempFilePath}"`
        console.log('Trying fallback printer:', fallbackCommand)
        await execAsync(fallbackCommand)
        unlinkSync(tempFilePath)
        return NextResponse.json({ success: true, message: 'Print job sent to EC58B printer' })
      } catch (fallbackError) {
        console.error('Fallback print error:', fallbackError)
        
        // Final fallback: Try default printer
        try {
          await execAsync(`lp "${tempFilePath}"`)
          unlinkSync(tempFilePath)
          return NextResponse.json({ success: true, message: 'Print job sent to default printer' })
        } catch (finalError) {
          console.error('Final print error:', finalError)
          return NextResponse.json({ 
            error: 'Failed to print. Please check printer connection.', 
            details: String(finalError) 
          }, { status: 500 })
        }
      }
    }
  } catch (error) {
    console.error('Print API error:', error)
    return NextResponse.json({ error: 'Failed to process print request' }, { status: 500 })
  }
}
