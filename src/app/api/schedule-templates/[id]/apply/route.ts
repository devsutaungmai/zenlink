import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'
import { hasAnyServerPermission } from '@/shared/lib/serverPermissions'
import { PERMISSIONS } from '@/shared/lib/permissions'

// Helper to get UTC date from date string (YYYY-MM-DD)
function parseUTCDate(dateStr: string): Date {
  return new Date(dateStr + 'T00:00:00.000Z')
}

// Helper to format date as YYYY-MM-DD
function formatDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}

// Helper to add days to a date string and return YYYY-MM-DD
function addDaysToDateString(dateStr: string, days: number): string {
  const date = parseUTCDate(dateStr)
  date.setUTCDate(date.getUTCDate() + days)
  return formatDateString(date)
}

// Helper to get the start of week (Sunday) for a date string
function getWeekStartDateString(dateStr: string): string {
  const date = parseUTCDate(dateStr)
  const dayOfWeek = date.getUTCDay() // 0 = Sunday, 1 = Monday, etc.
  date.setUTCDate(date.getUTCDate() - dayOfWeek)
  return formatDateString(date)
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

    // Extract the date string from the ISO date (YYYY-MM-DD)
    // This ensures we work with the date the user intended, regardless of timezone
    const targetDateStr = applyToDate.split('T')[0]
    let dateRangeStart: string
    let dateRangeEnd: string

    console.log('[Apply Template] Input applyToDate:', applyToDate)
    console.log('[Apply Template] Parsed targetDateStr:', targetDateStr)

    if (template.length === 'week') {
      const weekStartStr = getWeekStartDateString(targetDateStr)
      dateRangeStart = weekStartStr
      dateRangeEnd = addDaysToDateString(weekStartStr, 7)
      console.log('[Apply Template] Week template - weekStartStr:', weekStartStr)
    } else {
      dateRangeStart = targetDateStr
      dateRangeEnd = addDaysToDateString(targetDateStr, 1)
    }
    
    console.log('[Apply Template] Date range:', dateRangeStart, 'to', dateRangeEnd)

    if (existingShiftsOption === 'delete-all') {
      await prisma.shift.deleteMany({
        where: {
          employee: {
            user: {
              businessId
            }
          },
          date: {
            gte: parseUTCDate(dateRangeStart),
            lt: parseUTCDate(dateRangeEnd)
          }
        }
      })
    }

    const createdShifts = []
    const weekStartStr = template.length === 'week' ? getWeekStartDateString(targetDateStr) : targetDateStr

    console.log('[Apply Template] Template shifts count:', template.shifts.length)
    console.log('[Apply Template] Template shifts dayIndices:', template.shifts.map(s => s.dayIndex))

    for (const templateShift of template.shifts) {
      const shiftDateStr = template.length === 'week'
        ? addDaysToDateString(weekStartStr, templateShift.dayIndex)
        : targetDateStr
      
      const shiftDateUTC = parseUTCDate(shiftDateStr)
      
      console.log('[Apply Template] Creating shift - dayIndex:', templateShift.dayIndex, 'shiftDateStr:', shiftDateStr, 'shiftDateUTC:', shiftDateUTC.toISOString())

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
