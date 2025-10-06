import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/shared/lib/auth'
import jwt from 'jsonwebtoken'

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const newToken = jwt.sign(
      { 
        id: user.id, 
        role: user.role,
      }, 
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    )

    const response = NextResponse.json({
      success: true,
      message: 'Session refreshed successfully'
    })

    response.cookies.set(
      'token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
      sameSite: 'lax'
    })

    return response

  } catch (error) {
    console.error('Session refresh error:', error)
    return NextResponse.json({ error: 'Failed to refresh session' }, { status: 500 })
  }
}
