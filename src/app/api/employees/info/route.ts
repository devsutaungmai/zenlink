import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const employeeId = url.searchParams.get('employeeId');
    const email = url.searchParams.get('email');

    if (!employeeId && !email) {
      return NextResponse.json({ error: 'Either employeeId or email is required' }, { status: 400 });
    }

    let employee;

    if (employeeId) {
      employee = await prisma.employee.findUnique({
        where: { id: employeeId },
      });
    } else if (email) {
      employee = await prisma.employee.findUnique({
        where: { email },
      });
    }

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Return only the necessary information
    return NextResponse.json({
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
    });
  } catch (error: any) {
    console.error('Error fetching employee info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee information', details: error.message },
      { status: 500 }
    );
  }
}