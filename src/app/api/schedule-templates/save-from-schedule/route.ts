import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'
import { hasAnyServerPermission } from '@/shared/lib/serverPermissions'
import { PERMISSIONS } from '@/shared/lib/permissions'
import { startOfWeek, differenceInDays, parseISO } from 'date-fns'

interface ShiftData {
  id: string
  date: string | Date
  startTime: string
  endTime: string | null
  employeeId?: string | null
  employeeGroupId?: string | null
  functionId?: string | null
  departmentId?: string | null
  note?: string | null
  breakPaid?: boolean
}

export async function POST(request: NextRequest) {
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
      return NextResponse.json({ error: 'You do not have permission to save templates' }, { status: 403 })
    }
    
    const businessId = auth.type === 'user' ? (auth.data as any).businessId : (auth.data as any).user.businessId

    const body = await request.json()
    const { name, weekStart, shifts } = body as { 
      name: string
      weekStart: string
      shifts: ShiftData[]
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Template name is required' }, { status: 400 })
    }

    if (!shifts || shifts.length === 0) {
      return NextResponse.json({ error: 'No shifts to save' }, { status: 400 })
    }

    const weekStartDate = startOfWeek(parseISO(weekStart), { weekStartsOn: 0 })

    const template = await prisma.scheduleTemplate.create({
      data: {
        name: name.trim(),
        length: 'week',
        businessId,
        shifts: {
          create: shifts.map(shift => {
            const shiftDate = typeof shift.date === 'string' 
              ? parseISO(shift.date.substring(0, 10))
              : shift.date
            
            const dayIndex = differenceInDays(shiftDate, weekStartDate)
            
            return {
              dayIndex: Math.max(0, Math.min(6, dayIndex)),
              startTime: shift.startTime,
              endTime: shift.endTime || shift.startTime,
              employeeId: shift.employeeId || null,
              employeeGroupId: shift.employeeGroupId || null,
              functionId: shift.functionId || null,
              departmentId: shift.departmentId || null,
              note: shift.note || null,
              breakPaid: shift.breakPaid || false
            }
          })
        }
      },
      include: {
        shifts: true
      }
    })

    return NextResponse.json({
      success: true,
      template: {
        id: template.id,
        name: template.name,
        shiftsCount: template.shifts.length
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error saving schedule as template:', error)
    return NextResponse.json({ error: 'Failed to save template' }, { status: 500 })
  }
}
