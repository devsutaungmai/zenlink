import { prisma } from '@/shared/lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  const body = await req.json()
  const { email, password, rememberMe = true } = body

  if (!email || !password) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const passwordValid = await bcrypt.compare(password, user.password)
  if (!passwordValid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const tokenExpiry = rememberMe ? '90d' : '1d'
  const cookieMaxAge = rememberMe ? 60 * 60 * 24 * 90 : 60 * 60 * 24 // 90 days or 1 day

  const token = jwt.sign(
    { 
      id: user.id, 
      role: user.role,
      rememberMe,
    }, 
    process.env.JWT_SECRET!,
    { expiresIn: tokenExpiry }
  )

  const res = NextResponse.json({
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    }
  })

  // Still set cookie for web app (browser)
  res.cookies.set(
    'token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: cookieMaxAge,
    path: '/',
    sameSite: 'lax'
  })
  
  return res
}

