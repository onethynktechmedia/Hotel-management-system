export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import supabase from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dishId = searchParams.get('dish_id')

    if (!dishId) {
      return NextResponse.json({ error: 'dish_id is required' }, { status: 400 })
    }

    // Get all ratings for the dish
    const { data: ratings, error } = await supabase
      .from('dish_ratings')
      .select('rating')
      .eq('dish_id', dishId)

    if (error) throw error

    // Calculate average rating
    const averageRating = ratings && ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
      : 0

    return NextResponse.json({
      averageRating: Math.round(averageRating * 10) / 10,
      totalRatings: ratings?.length || 0
    })
  } catch (error) {
    console.error('Error fetching ratings:', error)
    return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { dish_id, rating } = body

    if (!dish_id || !rating) {
      return NextResponse.json({ error: 'dish_id and rating are required' }, { status: 400 })
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    // Get user IP (from headers)
    const userIp = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Check if user already rated this dish
    const { data: existing } = await supabase
      .from('dish_ratings')
      .select('id')
      .eq('dish_id', dish_id)
      .eq('user_ip', userIp)
      .single()

    if (existing) {
      // Update existing rating
      const { data, error } = await supabase
        .from('dish_ratings')
        .update({ rating })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      return NextResponse.json(data)
    }

    // Insert new rating
    const { data, error } = await supabase
      .from('dish_ratings')
      .insert({
        dish_id,
        rating,
        user_ip: userIp,
        user_agent: userAgent
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error saving rating:', error)
    return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 })
  }
}
