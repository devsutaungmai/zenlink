import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { getCurrentUser } from '@/shared/lib/auth'

export async function POST() {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    const businesses = await prisma.business.findMany({
      select: { id: true, name: true }
    })

    const results: any[] = []
    let totalUpdated = 0

    for (const business of businesses) {
      const defaultEmployeeRole = await prisma.role.findFirst({
        where: {
          businessId: business.id,
          name: 'Employee',
          isDefault: true
        }
      })

      if (!defaultEmployeeRole) {
        results.push({
          business: business.name,
          status: 'skipped',
          reason: 'No default Employee role found'
        })
        continue
      }

      const employeesWithoutRoles = await prisma.employee.findMany({
        where: {
          user: {
            businessId: business.id
          },
          employeeRoles: {
            none: {}
          }
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          employeeNo: true
        }
      })

      for (const employee of employeesWithoutRoles) {
        await prisma.employeeRole.create({
          data: {
            employeeId: employee.id,
            roleId: defaultEmployeeRole.id,
            isPrimary: true
          }
        })
        totalUpdated++
      }

      results.push({
        business: business.name,
        status: 'success',
        employeesUpdated: employeesWithoutRoles.length,
        employees: employeesWithoutRoles.map(e => `${e.firstName} ${e.lastName}`)
      })
    }

    return NextResponse.json({
      message: `Assigned default Employee role to ${totalUpdated} employees`,
      totalUpdated,
      results
    })
  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json({ error: 'Migration failed', details: error.message }, { status: 500 })
  }
}
