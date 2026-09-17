import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { billContent, printerName = 'EC58B' } = body

    if (!billContent) {
      return NextResponse.json({ error: 'No bill content provided' }, { status: 400 })
    }

    console.log('Print API called, content length:', billContent.length)

    // For production, we use WebUSB (client-side) for direct printing
    // This API endpoint is kept for logging and future server-side printing if needed
    // The actual printing is handled client-side using WebUSB in the admin/kitchen pages

    // Log the print request for tracking
    console.log('Print request received for tracking purposes')

    // Return success - the actual printing happens client-side via WebUSB
    return NextResponse.json({ 
      success: true, 
      message: 'Print request logged. Use WebUSB for actual printing.',
      useWebUSB: true,
      billContent: billContent
    }, { status: 200 })

  } catch (error) {
    console.error('Print API error:', error)
    return NextResponse.json({ 
      success: false,
      error: 'Internal server error',
      fallback: true
    }, { status: 500 })
  }
}
