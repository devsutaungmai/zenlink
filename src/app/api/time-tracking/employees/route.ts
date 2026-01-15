import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const businessName = searchParams.get('businessName')
    const departmentIds = searchParams.get('departmentIds')

    if (!businessName) {
      return NextResponse.json(
        { error: 'Business name is required' },
        { status: 400 }
      )
    }

    const trimmedName = businessName.trim()

    const business = await prisma.business.findFirst({
      where: {
        OR: [
          {
            name: {
              equals: trimmedName,
              mode: 'insensitive'
            }
          },
          {
            AND: [
              {
                name: {
                  contains: trimmedName,
                  mode: 'insensitive'
                }
              }
            ]
          }
        ]
      }
    })

    if (!business) {
      return NextResponse.json(
        { error: 'Business not found' },
        { status: 404 }
      )
    }

    const parsedDepartmentIds = departmentIds ? JSON.parse(departmentIds) : null

    const employeeWhere: any = {
      user: {
        businessId: business.id
      }
    }

    if (parsedDepartmentIds && Array.isArray(parsedDepartmentIds) && parsedDepartmentIds.length > 0) {
      employeeWhere.OR = [
        { departmentId: { in: parsedDepartmentIds } },
        { departments: { some: { departmentId: { in: parsedDepartmentIds } } } }
      ]
    }

    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeNo: true,
        email: true,
        mobile: true,
        isTeamLeader: true,
        profilePhoto: true,
        department: {
          select: {
            name: true
          }
        },
        employeeGroup: {
          select: {
            name: true
          }
        },
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(employees)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    )
  }
}
