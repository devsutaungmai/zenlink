import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ status: 'invalid_credentials' })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { business: true },
    })

    if (!user) return NextResponse.json({ status: 'invalid_credentials' })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return NextResponse.json({ status: 'invalid_credentials' })

    if (user.role === 'ADMIN' && !user.business.isApproved) {
      return NextResponse.json({ status: 'pending_approval' })
    }

    return NextResponse.json({ status: 'ok' })
  } catch {
    return NextResponse.json({ status: 'invalid_credentials' })
  }
}
