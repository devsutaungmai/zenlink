import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/shared/lib/auth';
import { prisma } from '@/shared/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payrollPeriod = await prisma.payrollPeriod.findFirst({
      where: {
        id: params.id,
        businessId: user.businessId,
      },
    });

    if (!payrollPeriod) {
      return NextResponse.json(
        { error: 'Payroll period not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(payrollPeriod);
  } catch (error) {
    console.error('Error fetching payroll period:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, startDate, endDate, status } = body;

    const existingPeriod = await prisma.payrollPeriod.findFirst({
      where: {
        id: params.id,
        businessId: user.businessId,
      },
    });

    if (!existingPeriod) {
      return NextResponse.json(
        { error: 'Payroll period not found' },
        { status: 404 }
      );
    }

    if (startDate && endDate) {
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
          id: { not: params.id },
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
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (startDate !== undefined) updateData.startDate = new Date(startDate);
    if (endDate !== undefined) updateData.endDate = new Date(endDate);
    if (status !== undefined) updateData.status = status;

    const payrollPeriod = await prisma.payrollPeriod.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(payrollPeriod);
  } catch (error) {
    console.error('Error updating payroll period:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

   
    const payrollPeriod = await prisma.payrollPeriod.findFirst({
      where: {
        id: params.id,
        businessId: user.businessId,
      },
    });

    if (!payrollPeriod) {
      return NextResponse.json(
        { error: 'Payroll period not found' },
        { status: 404 }
      );
    }

    if (payrollPeriod.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Cannot delete finalized or closed payroll periods' },
        { status: 400 }
      );
    }

    await prisma.payrollPeriod.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Payroll period deleted successfully' });
  } catch (error) {
    console.error('Error deleting payroll period:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
