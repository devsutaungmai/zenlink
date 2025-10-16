import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { sendPasswordResetOTP } from '@/shared/lib/email'

// Generate 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function POST(req: Request) {
  try {
    const { email } = await req.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!user) {
      // Security: Don't reveal if email exists
      await new Promise(resolve => setTimeout(resolve, 1000))
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, you will receive a verification code.',
      })
    }

    // Generate 6-digit OTP
    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes from now

    // Invalidate all previous unused tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        used: false,
      },
      data: {
        used: true,
      },
    })

    // Create new OTP token
    await prisma.passwordResetToken.create({
      data: {
        token: otp,
        userId: user.id,
        expiresAt,
        verified: false,
        used: false,
      },
    })

    // Send OTP email
    try {
      await sendPasswordResetOTP(
        user.email,
        `${user.firstName} ${user.lastName}`,
        otp
      )
    } catch (emailError) {
      console.error('Error sending OTP email:', emailError)
      return NextResponse.json(
        { error: 'Failed to send verification code. Please try again later.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, you will receive a verification code.',
    })
  } catch (error) {
    console.error('Error in forgot password:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
