import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'
import { hasAnyServerPermission } from '@/shared/lib/serverPermissions'
import { PERMISSIONS } from '@/shared/lib/permissions'
import { addDays, startOfWeek, format } from 'date-fns'

function toUTCDate(date: Date): Date {
  const dateString = format(date, 'yyyy-MM-dd')
  return new Date(dateString + 'T00:00:00.000Z')
}

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getCurrentUserOrEmployee()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check permission to use templates
    const canUseTemplates = await hasAnyServerPermission([
      PERMISSIONS.SCHEDULE_TEMPLATES
    ])
    
    if (!canUseTemplates) {
      return NextResponse.json({ error: 'You do not have permission to apply templates' }, { status: 403 })
    }
    
    const businessId = auth.type === 'user' ? (auth.data as any).businessId : (auth.data as any).user.businessId

    const { id: templateId } = await params
    const body = await request.json()
    const { applyToDate, existingShiftsOption } = body

    if (!applyToDate) {
      return NextResponse.json({ error: 'applyToDate is required' }, { status: 400 })
    }

    if (!['update', 'delete-all', 'keep'].includes(existingShiftsOption)) {
      return NextResponse.json({ error: 'Invalid existingShiftsOption' }, { status: 400 })
    }

    const template = await prisma.scheduleTemplate.findFirst({
      where: {
        id: templateId,
        businessId
      },
      include: {
        shifts: true
      }
    })

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const targetDate = new Date(applyToDate)
    let dateRange: { start: Date; end: Date }

    if (template.length === 'week') {
      const weekStart = startOfWeek(targetDate, { weekStartsOn: 0 })
      dateRange = {
        start: toUTCDate(weekStart),
        end: toUTCDate(addDays(weekStart, 7))
      }
    } else {
      dateRange = {
        start: toUTCDate(targetDate),
        end: toUTCDate(addDays(targetDate, 1))
      }
    }

    if (existingShiftsOption === 'delete-all') {
      await prisma.shift.deleteMany({
        where: {
          employee: {
            user: {
              businessId
            }
          },
          date: {
            gte: dateRange.start,
            lt: dateRange.end
          }
        }
      })
    }

    const createdShifts = []

    for (const templateShift of template.shifts) {
      const shiftDate = template.length === 'week'
        ? addDays(startOfWeek(targetDate, { weekStartsOn: 0 }), templateShift.dayIndex)
        : targetDate
      
      const shiftDateUTC = toUTCDate(shiftDate)

      if (existingShiftsOption === 'update' && templateShift.employeeId) {
        const existingShift = await prisma.shift.findFirst({
          where: {
            employeeId: templateShift.employeeId,
            date: shiftDateUTC
          }
        })

        if (existingShift) {
          const updated = await prisma.shift.update({
            where: { id: existingShift.id },
            data: {
              startTime: templateShift.startTime,
              endTime: templateShift.endTime || templateShift.startTime,
              employeeGroupId: templateShift.employeeGroupId,
              functionId: templateShift.functionId,
              departmentId: templateShift.departmentId,
              note: templateShift.note,
              breakPaid: templateShift.breakPaid || false
            }
          })
          createdShifts.push(updated)
          continue
        }
      }

      if (!templateShift.employeeId && !templateShift.employeeGroupId) {
        continue
      }

      try {
        const newShift = await prisma.shift.create({
          data: {
            date: shiftDateUTC,
            startTime: templateShift.startTime,
            endTime: templateShift.endTime || templateShift.startTime,
            employeeId: templateShift.employeeId || undefined,
            employeeGroupId: templateShift.employeeGroupId,
            functionId: templateShift.functionId,
            departmentId: templateShift.departmentId,
            note: templateShift.note,
            breakPaid: templateShift.breakPaid || false,
            shiftType: 'NORMAL',
            wage: 0,
            wageType: 'HOURLY',
            approved: false
          }
        })
        createdShifts.push(newShift)
      } catch (shiftError) {
        console.error('Error creating shift from template:', shiftError)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Applied ${createdShifts.length} shifts from template`,
      shiftsCreated: createdShifts.length,
      templateName: template.name
    })
  } catch (error) {
    console.error('Error applying schedule template:', error)
    return NextResponse.json({ error: 'Failed to apply template' }, { status: 500 })
  }
}
