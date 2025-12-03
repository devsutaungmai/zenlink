import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const auth = await getCurrentUserOrEmployee()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const businessId = auth.type === 'user' ? (auth.data as any).businessId : (auth.data as any).user.businessId

    const templates = await prisma.scheduleTemplate.findMany({
      where: { businessId },
      include: {
        shifts: true
      },
      orderBy: { updatedAt: 'desc' }
    })

    return NextResponse.json(templates)
  } catch (error) {
    console.error('Error fetching schedule templates:', error)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getCurrentUserOrEmployee()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const businessId = auth.type === 'user' ? (auth.data as any).businessId : (auth.data as any).user.businessId

    const body = await request.json()
    const { name, length } = body

    if (!name || !length) {
      return NextResponse.json({ error: 'Name and length are required' }, { status: 400 })
    }

    if (!['week', 'day'].includes(length)) {
      return NextResponse.json({ error: 'Invalid length. Must be "week" or "day"' }, { status: 400 })
    }

    const template = await prisma.scheduleTemplate.create({
      data: {
        name,
        length,
        businessId
      },
      include: {
        shifts: true
      }
    })

    return NextResponse.json(template, { status: 201 })
  } catch (error) {
    console.error('Error creating schedule template:', error)
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 })
  }
}
