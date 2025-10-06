import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const employeeId = url.searchParams.get('employeeId')

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 })
    }

    // Get employee with business information through department
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { 
        department: {
          include: {
            business: true
          }
        }
      }
    })

    if (!employee || !employee.department?.business) {
      return NextResponse.json({ error: 'Employee or business not found' }, { status: 404 })
    }

    const businessId = employee.department.business.id

    // Get punch clock access settings for the employee's business
    const settings = await prisma.punchClockAccessSettings.findUnique({
      where: { businessId: businessId },
      include: {
        allowedLocations: true
      }
    })

    if (!settings) {
      // Return default settings - allow punch from anywhere if no settings configured
      return NextResponse.json({
        allowPunchFromAnywhere: true,
        specificLocations: []
      })
    }

    // Filter locations based on department restrictions
    let filteredLocations = settings.allowedLocations

    // If department restrictions are enabled, filter locations
    if (settings.restrictByDepartment && settings.allowedDepartments.length > 0) {
      // Check if employee's department is in allowed departments
      if (!settings.allowedDepartments.includes(employee.departmentId)) {
        // Employee's department is not allowed to punch
        return NextResponse.json({
          allowPunchFromAnywhere: false,
          specificLocations: []
        })
      }
    }

    // Further filter locations by departmentIds if specified on individual locations
    filteredLocations = settings.allowedLocations.filter(location => {
      // If location has no department restrictions, it's available to all
      if (!location.departmentIds || location.departmentIds.length === 0) {
        return true
      }
      // If location has department restrictions, check if employee's department is allowed
      return location.departmentIds.includes(employee.departmentId)
    })

    return NextResponse.json({
      allowPunchFromAnywhere: settings.allowPunchFromAnywhere,
      specificLocations: filteredLocations.map(location => ({
        id: location.id,
        name: location.name,
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
        radius: location.radius
      }))
    })
  } catch (error) {
    console.error('Error fetching punch clock access settings for employee:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
