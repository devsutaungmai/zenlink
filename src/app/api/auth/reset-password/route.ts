import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(req: Request) {
  try {
    const { email, token, password } = await req.json()

    if (!email || !token || !password) {
      return NextResponse.json(
        { error: 'Email, verification code, and password are required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid verification code or email' },
        { status: 400 }
      )
    }

    // Find the verified OTP token
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token,
        userId: user.id,
        verified: true, // Must be verified
        used: false,    // Must not be used
      },
    })

    if (!resetToken) {
      return NextResponse.json(
        { error: 'Invalid or unverified code. Please verify your code first.' },
        { status: 400 }
      )
    }

    // Check if OTP has expired
    if (new Date() > resetToken.expiresAt) {
      return NextResponse.json(
        { error: 'Verification code has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Update user password and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { used: true },
      }),
    ])

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.',
    })
  } catch (error) {
    console.error('Error in reset password:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
