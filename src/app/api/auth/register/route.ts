import { prisma } from '@/shared/lib/prisma'
import bcrypt from 'bcryptjs'
import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export async function POST(req: Request) {
  try {
    const { user, business } = await req.json()
 
    if (!user?.email || !user?.password || !business?.businessName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: user.email },
      select: { email: true }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(user.password, 10)

    const result = await prisma.$transaction(async (tx) => {
      const newBusiness = await tx.business.create({
        data: {
          name: business.businessName,
          address: business.address,
          type: business.typeOfBusiness,
          employeesCount: business.employeesQty,
        },
      })

      const newUser = await tx.user.create({
        data: {
          email: user.email,
          password: hashedPassword,
          firstName: user.firstName,
          lastName: user.lastName,
          role: 'ADMIN',
          businessId: newBusiness.id,
        },
      })

      return { newUser, newBusiness }
    })

    const res = NextResponse.json({ 
      success: true,
      user: {
        id: result.newUser.id,
        email: result.newUser.email,
        firstName: result.newUser.firstName,
        lastName: result.newUser.lastName,
        role: result.newUser.role
      }
    })

    const token = jwt.sign(
      { 
        id: result.newUser.id, 
        role: result.newUser.role,
      }, 
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    )

    res.cookies.set(
      'token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
        sameSite: 'strict'
      })

    console.log('Cookie set:', { token, env: process.env.NODE_ENV });

    return res

  } catch (error: any) {
    console.error('Registration error:', error)

    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get('email')

    if (!email || !email.trim()) {
      return NextResponse.json({ exists: false })
    }

    const trimmedEmail = email.trim()

    const existingUser = await prisma.user.findFirst({
      where: {
        email: {
          equals: trimmedEmail,
          mode: 'insensitive'
        }
      },
      select: { id: true }
    })

    return NextResponse.json({ exists: Boolean(existingUser) })
  } catch (error) {
    console.error('Email availability check failed:', error)
    return NextResponse.json({ exists: false, error: 'Unable to verify email at the moment' }, { status: 500 })
  }
}
