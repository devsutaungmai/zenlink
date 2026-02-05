import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { requireAuth, getCurrentUserOrEmployee, getCurrentEmployee } from '@/shared/lib/auth'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const forEmployee = searchParams.get('forEmployee') === 'true'

    let businessId: string | undefined
    let employeeDepartmentIds: string[] = []

    if (forEmployee) {
      const employee = await getCurrentEmployee()
      if (!employee) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const employeeWithDepts = await prisma.employee.findUnique({
        where: { id: employee.id },
        include: {
          departments: { select: { departmentId: true } },
          department: { select: { id: true, businessId: true } }
        }
      })

      if (employeeWithDepts) {
        businessId = employeeWithDepts.department?.businessId
        employeeDepartmentIds = [
          ...(employeeWithDepts.department?.id ? [employeeWithDepts.department.id] : []),
          ...employeeWithDepts.departments.map(d => d.departmentId)
        ].filter((id, index, arr) => arr.indexOf(id) === index)
      }

      if (!businessId) {
        return NextResponse.json({ error: 'Employee business not found' }, { status: 400 })
      }
    } else {
      const auth = await getCurrentUserOrEmployee()
      if (!auth) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      if (auth.type === 'user') {
        businessId = (auth.data as any).businessId
      } else {
        const employee = auth.data as any
        businessId = employee.department?.businessId
      }
    }

    const whereClause: any = { businessId }

    if (forEmployee) {
      whereClause.status = 'PUBLISHED'
      if (employeeDepartmentIds.length > 0) {
        whereClause.OR = [
          { allDepartments: true },
          { departments: { some: { departmentId: { in: employeeDepartmentIds } } } }
        ]
      } else {
        whereClause.allDepartments = true
      }
    } else if (status) {
      whereClause.status = status
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        departments: {
          include: {
            department: {
              select: { id: true, name: true }
            }
          }
        }
      },
      orderBy: { eventDate: 'asc' }
    })

    const transformedEvents = events.map(event => ({
      ...event,
      departments: event.departments.map(ed => ed.department)
    }))

    return NextResponse.json(transformedEvents)
  } catch (error: any) {
    console.error('Failed to fetch events:', error)
    return NextResponse.json(
      { error: 'Failed to fetch events', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    const data = await request.json()

    if (!data.title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!data.eventDate) {
      return NextResponse.json({ error: 'Event date is required' }, { status: 400 })
    }

    if (!data.startTime) {
      return NextResponse.json({ error: 'Start time is required' }, { status: 400 })
    }

    const event = await prisma.event.create({
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
        business: { connect: { id: user.businessId } },
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
    console.error('Failed to create event:', error)
    return NextResponse.json(
      { error: 'Failed to create event', details: error.message },
      { status: 500 }
    )
  }
}
