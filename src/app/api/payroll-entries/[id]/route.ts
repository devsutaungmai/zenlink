import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/shared/lib/auth';
import { prisma } from '@/shared/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const payrollEntry = await prisma.payrollEntry.findFirst({
      where: {
        id: id,
        payrollPeriod: {
          businessId: user.businessId,
        },
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

    if (!payrollEntry) {
      return NextResponse.json(
        { error: 'Payroll entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(payrollEntry);
  } catch (error) {
    console.error('Error fetching payroll entry:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const body = await request.json();
    const {
      regularHours,
      overtimeHours,
      regularRate,
      overtimeRate,
      deductions,
      bonuses,
      status,
      notes
    } = body;

    const existingEntry = await prisma.payrollEntry.findFirst({
      where: {
        id: id,
        payrollPeriod: {
          businessId: user.businessId,
        },
      },
    });

    if (!existingEntry) {
      return NextResponse.json(
        { error: 'Payroll entry not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    
    if (regularHours !== undefined) updateData.regularHours = regularHours;
    if (overtimeHours !== undefined) updateData.overtimeHours = overtimeHours;
    if (regularRate !== undefined) updateData.regularRate = regularRate;
    if (overtimeRate !== undefined) updateData.overtimeRate = overtimeRate;
    if (deductions !== undefined) updateData.deductions = deductions;
    if (bonuses !== undefined) updateData.bonuses = bonuses;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    // Recalculate gross pay and net pay if any amounts changed
    if (regularHours !== undefined || overtimeHours !== undefined || 
        regularRate !== undefined || overtimeRate !== undefined || 
        bonuses !== undefined || deductions !== undefined) {
      
      const finalRegularHours = regularHours ?? existingEntry.regularHours;
      const finalOvertimeHours = overtimeHours ?? existingEntry.overtimeHours;
      const finalRegularRate = regularRate ?? existingEntry.regularRate;
      const finalOvertimeRate = overtimeRate ?? existingEntry.overtimeRate;
      const finalBonuses = bonuses ?? existingEntry.bonuses;
      const finalDeductions = deductions ?? existingEntry.deductions;

      const grossPay = (finalRegularHours * finalRegularRate) + 
                      (finalOvertimeHours * finalOvertimeRate) + 
                      finalBonuses;
      const netPay = grossPay - finalDeductions;

      updateData.grossPay = grossPay;
      updateData.netPay = netPay;
    }

    const payrollEntry = await prisma.payrollEntry.update({
      where: { id: id },
      data: updateData,
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

    return NextResponse.json(payrollEntry);
  } catch (error) {
    console.error('Error updating payroll entry:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payrollEntry = await prisma.payrollEntry.findFirst({
      where: {
        id: id,
        payrollPeriod: {
          businessId: user.businessId,
        },
      },
    });

    if (!payrollEntry) {
      return NextResponse.json(
        { error: 'Payroll entry not found' },
        { status: 404 }
      );
    }

    if (payrollEntry.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Cannot delete approved or paid payroll entries' },
        { status: 400 }
      );
    }

    await prisma.payrollEntry.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: 'Payroll entry deleted successfully' });
  } catch (error) {
    console.error('Error deleting payroll entry:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
