import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { requireAuth } from '@/shared/lib/auth'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await context.params

    const event = await prisma.event.findUnique({
      where: { id, businessId: user.businessId },
      include: {
        departments: {
          include: {
            department: { select: { id: true, name: true } }
          }
        }
      }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const transformedEvent = {
      ...event,
      departments: event.departments.map(ed => ed.department)
    }

    return NextResponse.json(transformedEvent)
  } catch (error) {
    console.error('GET event error:', error)
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await context.params
    const data = await request.json()

    if (!data.title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const existingEvent = await prisma.event.findUnique({
      where: { id, businessId: user.businessId }
    })

    if (!existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    await prisma.eventDepartment.deleteMany({
      where: { eventId: id }
    })

    const event = await prisma.event.update({
      where: { id, businessId: user.businessId },
      data: {
        title: data.title,
        description: data.description || null,
        eventDate: new Date(data.eventDate),
        startTime: data.startTime,
        endTime: data.endTime || null,
        location: data.location || null,
        type: data.type || 'EVENT',
        status: data.status || 'DRAFT',
        allDepartments: data.allDepartments || false,
        departments: data.departmentIds?.length && !data.allDepartments
          ? {
              create: data.departmentIds.map((deptId: string) => ({
                department: { connect: { id: deptId } }
              }))
            }
          : undefined
      },
      include: {
        departments: {
          include: {
            department: { select: { id: true, name: true } }
          }
        }
      }
    })

    const transformedEvent = {
      ...event,
      departments: event.departments.map(ed => ed.department)
    }

    return NextResponse.json(transformedEvent)
  } catch (error: any) {
    console.error('Update event error:', error)
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await context.params

    const event = await prisma.event.findUnique({
      where: { id, businessId: user.businessId }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    await prisma.event.delete({
      where: { id, businessId: user.businessId }
    })

    return NextResponse.json({ message: 'Event deleted successfully' })
  } catch (error: any) {
    console.error('Delete event error:', error)
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    )
  }
}
