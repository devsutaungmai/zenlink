import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/shared/lib/auth';
import { prisma } from '@/shared/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const payrollPeriodId = searchParams.get('payrollPeriodId');
    const status = searchParams.get('status');
    const employeeId = searchParams.get('employeeId');

    const where: any = {
      payrollPeriod: {
        businessId: user.businessId,
      },
    };

    if (payrollPeriodId) {
      where.payrollPeriodId = payrollPeriodId;
    }

    if (status) {
      where.status = status;
    }

    if (employeeId) {
      where.employeeId = employeeId;
    }

    const [payrollEntries, total] = await Promise.all([
      prisma.payrollEntry.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              employeeNo: true,
              email: true,
            },
          },
          payrollPeriod: {
            select: {
              id: true,
              name: true,
              startDate: true,
              endDate: true,
              status: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payrollEntry.count({ where }),
    ]);

    return NextResponse.json({
      payrollEntries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching payroll entries:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      employeeId,
      payrollPeriodId,
      regularHours = 0,
      overtimeHours = 0,
      regularRate,
      overtimeRate,
      deductions = 0,
      bonuses = 0,
      notes
    } = body;

    if (!employeeId || !payrollPeriodId || !regularRate || !overtimeRate) {
      return NextResponse.json(
        { error: 'Employee ID, payroll period ID, regular rate, and overtime rate are required' },
        { status: 400 }
      );
    }

    const payrollPeriod = await prisma.payrollPeriod.findFirst({
      where: {
        id: payrollPeriodId,
        businessId: user.businessId,
      },
    });

    if (!payrollPeriod) {
      return NextResponse.json(
        { error: 'Payroll period not found' },
        { status: 404 }
      );
    }

    const employee = await prisma.employee.findFirst({
      where: {
        id: employeeId,
        department: {
          businessId: user.businessId,
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    const existingEntry = await prisma.payrollEntry.findUnique({
      where: {
        employeeId_payrollPeriodId: {
          employeeId,
          payrollPeriodId,
        },
      },
    });

    if (existingEntry) {
      return NextResponse.json(
        { error: 'Payroll entry already exists for this employee and period' },
        { status: 400 }
      );
    }

    const grossPay = (regularHours * regularRate) + (overtimeHours * overtimeRate) + bonuses;
    const netPay = grossPay - deductions;

    const payrollEntry = await prisma.payrollEntry.create({
      data: {
        employeeId,
        payrollPeriodId,
        regularHours,
        overtimeHours,
        regularRate,
        overtimeRate,
        grossPay,
        deductions,
        netPay,
        bonuses,
        notes,
      },
      include: {
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeNo: true,
            email: true,
          },
        },
        payrollPeriod: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json(payrollEntry, { status: 201 });
  } catch (error) {
    console.error('Error creating payroll entry:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
