import { NextResponse } from 'next/server';
import { prisma } from '@/shared/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { email, firstName, lastName, password, employeeId } = await req.json();
    
    // Find the employee either by ID or email
    let employee;
    
    if (employeeId) {
      employee = await prisma.employee.findUnique({
        where: { id: employeeId },
        include: {
          user: true,
          department: {
            select: {
              businessId: true
            }
          }
        }
      });
    } else if (email) {
      employee = await prisma.employee.findUnique({
        where: { email },
        include: {
          user: true,
          department: {
            select: {
              businessId: true
            }
          }
        }
      });
    }

    if (!employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (!employee.user) {
      return NextResponse.json({ error: 'User account not found for this employee' }, { status: 404 });
    }

    const businessId = employee.department.businessId;

    if (employee.user.password && employee.user.password.length > 0) {
      return NextResponse.json({ error: 'Password already set for this account' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const updatedUser = await prisma.user.update({
      where: { id: employee.user.id },
      data: {
        email: email,
        password: hashedPassword,
        firstName: firstName,
        lastName: lastName,
      },
    });

    if (email && email !== employee.email) {
      await prisma.employee.update({
        where: { id: employee.id },
        data: { email: email },
      });
    }

    return NextResponse.json({ 
      message: 'Password set successfully',
      userId: updatedUser.id
    });
  } catch (error: any) {
    console.error('Registration error:', error);

    if (error.code === 'P2002' && error.meta?.target?.includes('email')) {
      return NextResponse.json(
        { error: 'This email is already in use by another account' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: 'Registration failed', details: error.message },
      { status: 500 }
    );
  }
}