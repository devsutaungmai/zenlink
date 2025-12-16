import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'
import { COUNTRY_RULES, DEFAULT_LABOR_RULES } from '@/shared/lib/laborLawValidation'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const countryCode = searchParams.get('countryCode')
    const activeOnly = searchParams.get('activeOnly') === 'true'

    const where: any = {
      businessId: user.businessId,
    }

    if (countryCode) {
      where.countryCode = countryCode
    }

    if (activeOnly) {
      where.isActive = true
    }

    const settings = await prisma.laborLawSettings.findMany({
      where,
      orderBy: {
        countryCode: 'asc',
      },
    })

    if (activeOnly && settings.length === 0) {
      return NextResponse.json({
        settings: [{
          countryCode: 'NO',
          isActive: true,
          ...COUNTRY_RULES['NO'],
        }],
        isDefault: true,
      })
    }

    if (countryCode && settings.length === 0) {
      const countryDefaults = COUNTRY_RULES[countryCode] || DEFAULT_LABOR_RULES
      return NextResponse.json({
        settings: [{
          countryCode: countryCode,
          isActive: false,
          ...countryDefaults,
        }],
        isDefault: true,
      })
    }

    return NextResponse.json({ settings, isDefault: false })
  } catch (error) {
    console.error('Error fetching labor law settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      countryCode,
      maxHoursPerDay,
      maxHoursPerWeek,
      maxOvertimePerDay,
      maxOvertimePerWeek,
      maxConsecutiveDays,
      minRestHoursBetweenShifts,
      longShiftThreshold,
      minBreakForLongShifts,
      overtimeThreshold,
      isActive,
    } = body

    if (!countryCode) {
      return NextResponse.json(
        { error: 'Country code is required' },
        { status: 400 }
      )
    }

    if (isActive) {
      await prisma.laborLawSettings.updateMany({
        where: {
          businessId: user.businessId,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      })
    }

    const settings = await prisma.laborLawSettings.upsert({
      where: {
        businessId_countryCode: {
          businessId: user.businessId,
          countryCode: countryCode,
        },
      },
      update: {
        maxHoursPerDay: maxHoursPerDay ?? undefined,
        maxHoursPerWeek: maxHoursPerWeek ?? undefined,
        maxOvertimePerDay: maxOvertimePerDay ?? undefined,
        maxOvertimePerWeek: maxOvertimePerWeek ?? undefined,
        maxConsecutiveDays: maxConsecutiveDays ?? undefined,
        minRestHoursBetweenShifts: minRestHoursBetweenShifts ?? undefined,
        longShiftThreshold: longShiftThreshold ?? undefined,
        minBreakForLongShifts: minBreakForLongShifts ?? undefined,
        overtimeThreshold: overtimeThreshold ?? undefined,
        isActive: isActive ?? undefined,
      },
      create: {
        businessId: user.businessId,
        countryCode,
        maxHoursPerDay: maxHoursPerDay ?? COUNTRY_RULES[countryCode]?.maxHoursPerDay ?? DEFAULT_LABOR_RULES.maxHoursPerDay,
        maxHoursPerWeek: maxHoursPerWeek ?? COUNTRY_RULES[countryCode]?.maxHoursPerWeek ?? DEFAULT_LABOR_RULES.maxHoursPerWeek,
        maxOvertimePerDay: maxOvertimePerDay ?? COUNTRY_RULES[countryCode]?.maxOvertimePerDay ?? DEFAULT_LABOR_RULES.maxOvertimePerDay,
        maxOvertimePerWeek: maxOvertimePerWeek ?? COUNTRY_RULES[countryCode]?.maxOvertimePerWeek ?? DEFAULT_LABOR_RULES.maxOvertimePerWeek,
        maxConsecutiveDays: maxConsecutiveDays ?? COUNTRY_RULES[countryCode]?.maxConsecutiveDays ?? DEFAULT_LABOR_RULES.maxConsecutiveDays,
        minRestHoursBetweenShifts: minRestHoursBetweenShifts ?? COUNTRY_RULES[countryCode]?.minRestHoursBetweenShifts ?? DEFAULT_LABOR_RULES.minRestHoursBetweenShifts,
        longShiftThreshold: longShiftThreshold ?? COUNTRY_RULES[countryCode]?.longShiftThreshold ?? DEFAULT_LABOR_RULES.longShiftThreshold,
        minBreakForLongShifts: minBreakForLongShifts ?? COUNTRY_RULES[countryCode]?.minBreakForLongShifts ?? DEFAULT_LABOR_RULES.minBreakForLongShifts,
        overtimeThreshold: overtimeThreshold ?? COUNTRY_RULES[countryCode]?.overtimeThreshold ?? DEFAULT_LABOR_RULES.overtimeThreshold,
        isActive: isActive ?? true,
      },
    })

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Error saving labor law settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
