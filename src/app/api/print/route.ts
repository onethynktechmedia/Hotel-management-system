import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { content } = await request.json()

    if (!content) {
      return NextResponse.json({ error: 'No content provided' }, { status: 400 })
    }

    // Server-side printing is not supported on Vercel
    // Return the content for client-side printing
    return NextResponse.json({ 
      success: true, 
      message: 'Use client-side printing',
      content: content 
    })
  } catch (error) {
    console.error('Print API error:', error)
    return NextResponse.json({ error: 'Failed to prepare print content', details: String(error) }, { status: 500 })
  }
}
