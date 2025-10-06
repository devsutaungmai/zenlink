import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: Request) {
  try {
    const { email, firstName, lastName, password, employeeId } = await req.json();
    
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
    }

    const business = await prisma.business.findFirst();
    
    if (!business) {
      return NextResponse.json({ error: 'No business found' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'EMPLOYEE',
        businessId: business.id,
      },
    });

    // Find the employee either by ID or email
    let employee;
    
    if (employeeId) {
      employee = await prisma.employee.findUnique({
        where: { id: employeeId },
      });
    } else {
      employee = await prisma.employee.findUnique({
        where: { email },
      });
    }

    // If employee exists, update the userId
    if (employee) {
      await prisma.employee.update({
        where: { id: employee.id },
        data: { userId: user.id },
      });
    }

    return NextResponse.json({ 
      message: 'User registered successfully',
      userId: user.id
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Registration failed', details: error.message },
      { status: 500 }
    );
  }
}