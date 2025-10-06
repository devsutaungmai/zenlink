import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { requireAuth } from '@/shared/lib/auth'
import bcrypt from 'bcryptjs'
import nodemailer from 'nodemailer'

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    
    const user = await requireAuth()
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { pin } = await request.json()

    if (!pin || !/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { error: 'PIN must be exactly 6 digits' },
        { status: 400 }
      )
    }

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: { user: true }
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Hash the PIN before storing it
    const hashedPin = await bcrypt.hash(pin, 10)

    await prisma.user.update({
      where: { id: employee.userId },
      data: { pin: hashedPin }
    })

    // Send PIN via email if employee has an email address
    let emailSent = false
    if (employee.email) {
      try {
        // Create a Nodemailer transporter using Gmail
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: process.env.GMAIL_USER || 'zenlinkdev@gmail.com',
            pass: process.env.GMAIL_APP_PASSWORD,
          },
          tls: {
            rejectUnauthorized: false
          }
        })

        await transporter.sendMail({
          from: `"Zen Link" <${process.env.FROM_EMAIL || process.env.GMAIL_USER || 'zenlinkdev@gmail.com'}>`,
          to: employee.email,
          subject: "Your New PIN for Zen Link",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #31BCFF; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">Zen Link</h1>
              </div>
              <div style="padding: 20px; border: 1px solid #e9e9e9; border-top: none;">
                <h2>Your New PIN</h2>
                <p>Hello ${employee.firstName} ${employee.lastName},</p>
                <p>Your administrator has set a new PIN for your Zen Link account:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <div style="background-color: #f8f9fa; border: 2px solid #31BCFF; padding: 20px; border-radius: 8px; display: inline-block;">
                    <span style="font-size: 32px; font-weight: bold; color: #31BCFF; font-family: monospace; letter-spacing: 8px;">
                      ${pin}
                    </span>
                  </div>
                </div>
                <p>You can use this PIN to clock in/out and access your employee dashboard.</p>
                <p><strong>Important:</strong> Please keep this PIN secure and do not share it with others.</p>
              </div>
              <div style="text-align: center; padding: 10px; color: #666; font-size: 12px;">
                <p>© 2023 Zen Link. All rights reserved.</p>
              </div>
            </div>
          `,
        })

        emailSent = true
        console.log(`PIN email sent to ${employee.email} for employee ${employee.firstName} ${employee.lastName}`)
      } catch (emailError) {
        console.error('Error sending PIN email:', emailError)
        // Don't fail the request if email fails, just log it
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'PIN updated successfully',
      emailSent: emailSent,
      ...(emailSent && { emailMessage: 'PIN has been sent to employee\'s email address' })
    })

  } catch (error) {
    console.error('Error updating PIN:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
