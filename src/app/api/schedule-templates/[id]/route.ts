import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getCurrentUserOrEmployee()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const businessId = auth.type === 'user' ? (auth.data as any).businessId : (auth.data as any).user.businessId

    const { id } = await params

    const template = await prisma.scheduleTemplate.findFirst({
      where: {
        id,
        businessId
      },
      include: {
        shifts: {
          orderBy: [
            { dayIndex: 'asc' },
            { startTime: 'asc' }
          ]
        }
      }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error fetching schedule template:', error)
    return NextResponse.json({ error: 'Failed to fetch template' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getCurrentUserOrEmployee()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const businessId = auth.type === 'user' ? (auth.data as any).businessId : (auth.data as any).user.businessId

    const { id } = await params
    const body = await request.json()
    const { name } = body

    const existingTemplate = await prisma.scheduleTemplate.findFirst({
      where: {
        id,
        businessId
      }
    })

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const template = await prisma.scheduleTemplate.update({
      where: { id },
      data: {
        ...(name && { name }),
        updatedAt: new Date()
      },
      include: {
        shifts: {
          orderBy: [
            { dayIndex: 'asc' },
            { startTime: 'asc' }
          ]
        }
      }
    })

    return NextResponse.json(template)
  } catch (error) {
    console.error('Error updating schedule template:', error)
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getCurrentUserOrEmployee()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const businessId = auth.type === 'user' ? (auth.data as any).businessId : (auth.data as any).user.businessId

    const { id } = await params

    const existingTemplate = await prisma.scheduleTemplate.findFirst({
      where: {
        id,
        businessId
      }
    })

    if (!existingTemplate) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    await prisma.scheduleTemplate.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting schedule template:', error)
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 })
  }
}
