import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/shared/lib/auth';
import { prisma } from '@/shared/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    console.log('Payroll periods - user:', user ? {
      id: user.id,
      email: user.email,
      role: user.role,
      businessId: user.businessId
    } : 'null');
    
    if (!user) {
      console.log('Payroll periods - user is null, returning 401');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');

    const where: any = {
      businessId: user.businessId,
    };

    if (status) {
      where.status = status;
    }

    const [payrollPeriods, total] = await Promise.all([
      prisma.payrollPeriod.findMany({
        where,
        orderBy: { startDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.payrollPeriod.count({ where }),
    ]);

    return NextResponse.json({
      payrollPeriods,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching payroll periods:', error);
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
    const { name, startDate, endDate, status = 'DRAFT' } = body;

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Name, start date, and end date are required' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      );
    }

    const overlapping = await prisma.payrollPeriod.findFirst({
      where: {
        businessId: user.businessId,
        OR: [
          {
            AND: [
              { startDate: { lte: start } },
              { endDate: { gte: start } }
            ]
          },
          {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: end } }
            ]
          },
          {
            AND: [
              { startDate: { gte: start } },
              { endDate: { lte: end } }
            ]
          }
        ]
      }
    });

    if (overlapping) {
      return NextResponse.json(
        { error: 'Payroll period overlaps with existing period' },
        { status: 400 }
      );
    }

    const payrollPeriod = await prisma.payrollPeriod.create({
      data: {
        name,
        startDate: start,
        endDate: end,
        status,
        businessId: user.businessId,
      },
    });

    return NextResponse.json(payrollPeriod, { status: 201 });
  } catch (error) {
    console.error('Error creating payroll period:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
