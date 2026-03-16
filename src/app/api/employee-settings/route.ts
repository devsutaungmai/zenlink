import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userWithBusiness = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: { business: true }
    })

    if (!userWithBusiness?.businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const settings = await prisma.employeeSettings.findUnique({
      where: { businessId: userWithBusiness.businessId }
    })

    if (!settings) {
      const employeeRole = await prisma.role.findFirst({
        where: {
          businessId: userWithBusiness.businessId,
          OR: [
            { isDefault: true },
            { name: 'Employee' }
          ]
        },
        orderBy: { isDefault: 'desc' }
      })

      return NextResponse.json({
        requireFirstName: true,
        requireLastName: true,
        requireBirthday: true,
        requireGender: true,
        requireAddress: true,
        requirePhone: true,
        requireEmail: true,
        requireSocialSecurityNo: true,
        requireEmployeeNo: true,
        requireDateOfHire: true,
        requireHoursPerMonth: true,
        requireBankAccount: true,
        requireDepartment: true,
        requireEmployeeGroup: true,
        requireRole: true,
        requireSalaryRate: true,
        incompleteProfileBehavior: 'SHOW_WARNING',
        defaultDepartmentId: null,
        defaultEmployeeGroupId: null,
        defaultRoleId: employeeRole?.id || null,
        rolesCanViewEmployees: [],
        employeesCanSeeContactInfo: true,
        limitVisibilityByDepartment: false,
        onboardingRequiredFields: [],
        requireManagerApproval: false,
        sendMissingInfoReminder: true,
        reminderDaysAfterHire: 7,
        defaultLanguage: 'en',
        employeeNotificationsEnabled: true,
        employeesCanEditProfile: true,
        employeeEditableFields: ['phone', 'address', 'profilePhoto']
      })
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching employee settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser()
    if (!currentUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userWithBusiness = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: { 
        business: true,
        assignedRole: {
          include: {
            permissions: {
              include: {
                permission: true
              }
            }
          }
        }
      }
    })

    if (!userWithBusiness?.businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const hasPermission = userWithBusiness.role === 'ADMIN' || 
      userWithBusiness.assignedRole?.permissions.some(
        p => p.permission.code === 'settings.people_general'
      )

    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const data = await req.json()

    // Resolve default Employee role for sensible defaults
    const defaultEmployeeRole = await prisma.role.findFirst({
      where: {
        businessId: userWithBusiness.businessId,
        OR: [
          { isDefault: true },
          { name: 'Employee' }
        ]
      },
      orderBy: { isDefault: 'desc' }
    })

    const settings = await prisma.employeeSettings.upsert({
      where: { businessId: userWithBusiness.businessId },
      create: {
        businessId: userWithBusiness.businessId,
        requireFirstName: data.requireFirstName ?? true,
        requireLastName: data.requireLastName ?? true,
        requireBirthday: data.requireBirthday ?? true,
        requireGender: data.requireGender ?? true,
        requireAddress: data.requireAddress ?? true,
        requirePhone: data.requirePhone ?? true,
        requireEmail: data.requireEmail ?? true,
        requireSocialSecurityNo: data.requireSocialSecurityNo ?? true,
        requireEmployeeNo: data.requireEmployeeNo ?? true,
        requireDateOfHire: data.requireDateOfHire ?? true,
        requireHoursPerMonth: data.requireHoursPerMonth ?? true,
        requireBankAccount: data.requireBankAccount ?? true,
        requireDepartment: data.requireDepartment ?? true,
        requireEmployeeGroup: data.requireEmployeeGroup ?? true,
        requireRole: data.requireRole ?? true,
        requireSalaryRate: data.requireSalaryRate ?? true,
        incompleteProfileBehavior: data.incompleteProfileBehavior ?? 'SHOW_WARNING',
        defaultDepartmentId: data.defaultDepartmentId || null,
        defaultEmployeeGroupId: data.defaultEmployeeGroupId || null,
        defaultRoleId: data.defaultRoleId || defaultEmployeeRole?.id || null,
        rolesCanViewEmployees: data.rolesCanViewEmployees ?? [],
        employeesCanSeeContactInfo: data.employeesCanSeeContactInfo ?? true,
        limitVisibilityByDepartment: data.limitVisibilityByDepartment ?? false,
        onboardingRequiredFields: data.onboardingRequiredFields ?? [],
        requireManagerApproval: data.requireManagerApproval ?? false,
        sendMissingInfoReminder: data.sendMissingInfoReminder ?? true,
        reminderDaysAfterHire: data.reminderDaysAfterHire ?? 7,
        defaultLanguage: data.defaultLanguage ?? 'en',
        employeeNotificationsEnabled: data.employeeNotificationsEnabled ?? true,
        employeesCanEditProfile: data.employeesCanEditProfile ?? true,
        employeeEditableFields: data.employeeEditableFields ?? ['phone', 'address', 'profilePhoto']
      },
      update: {
        requireFirstName: data.requireFirstName,
        requireLastName: data.requireLastName,
        requireBirthday: data.requireBirthday,
        requireGender: data.requireGender,
        requireAddress: data.requireAddress,
        requirePhone: data.requirePhone,
        requireEmail: data.requireEmail,
        requireSocialSecurityNo: data.requireSocialSecurityNo,
        requireEmployeeNo: data.requireEmployeeNo,
        requireDateOfHire: data.requireDateOfHire,
        requireHoursPerMonth: data.requireHoursPerMonth,
        requireBankAccount: data.requireBankAccount,
        requireDepartment: data.requireDepartment,
        requireEmployeeGroup: data.requireEmployeeGroup,
        requireRole: data.requireRole,
        requireSalaryRate: data.requireSalaryRate,
        incompleteProfileBehavior: data.incompleteProfileBehavior,
        defaultDepartmentId: data.defaultDepartmentId || null,
        defaultEmployeeGroupId: data.defaultEmployeeGroupId || null,
        defaultRoleId: data.defaultRoleId || null,
        rolesCanViewEmployees: data.rolesCanViewEmployees,
        employeesCanSeeContactInfo: data.employeesCanSeeContactInfo,
        limitVisibilityByDepartment: data.limitVisibilityByDepartment,
        onboardingRequiredFields: data.onboardingRequiredFields,
        requireManagerApproval: data.requireManagerApproval,
        sendMissingInfoReminder: data.sendMissingInfoReminder,
        reminderDaysAfterHire: data.reminderDaysAfterHire,
        defaultLanguage: data.defaultLanguage,
        employeeNotificationsEnabled: data.employeeNotificationsEnabled,
        employeesCanEditProfile: data.employeesCanEditProfile,
        employeeEditableFields: data.employeeEditableFields
      }
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error saving employee settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
