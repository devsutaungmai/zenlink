import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json()

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      )
    }

    // Find the OTP token
    const otpToken = await prisma.passwordResetToken.findFirst({
      where: {
        token: otp,
        userId: user.id,
        used: false,
        verified: false,
      },
    })

    if (!otpToken) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      )
    }

    // Check if OTP has expired
    if (new Date() > otpToken.expiresAt) {
      return NextResponse.json(
        { error: 'Verification code has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Mark OTP as verified (but not used yet)
    await prisma.passwordResetToken.update({
      where: { id: otpToken.id },
      data: { verified: true },
    })

    return NextResponse.json({
      success: true,
      message: 'Verification code confirmed. You can now reset your password.',
      token: otp, // Return the OTP to use for password reset
    })
  } catch (error) {
    console.error('Error in verify OTP:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
