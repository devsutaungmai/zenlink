import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'
import { checkEmployeeProfileStatus } from '@/shared/lib/employeeProfileHelper'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        user: {
          select: { 
            id: true,
            businessId: true,
            pin: true,
            password: true
          }
        }
      }
    })

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    if (employee.user?.businessId !== currentUser.businessId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const profileStatus = await checkEmployeeProfileStatus(currentUser.businessId, {
      id: employee.id,
      user: employee.user
    })

    return NextResponse.json({
      employeeId: id,
      ...profileStatus
    })
  } catch (error) {
    console.error('Error checking profile status:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
