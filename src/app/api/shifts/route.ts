import { NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { SMSService, NotificationService } from '@/lib/notifications'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    const currentUser = await getCurrentUser()
    const cookieStore = await cookies()
    const employeeToken = cookieStore.get('employee_token')?.value

    let isAuthorized = false
    let currentEmployeeId = null

    if (currentUser) {
      isAuthorized = true
    }

    if (!isAuthorized && employeeToken) {
      try {
        const decoded = jwt.verify(employeeToken, process.env.JWT_SECRET!) as {
          id: string
          employeeId: string
          type: string
        }

        if (decoded.type === 'employee') {
          isAuthorized = true
          currentEmployeeId = decoded.employeeId
        }
      } catch (error) {
        console.error('Error verifying employee token:', error)
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    let employeeId = searchParams.get('employeeId')

    if (currentEmployeeId && !currentUser) {
      employeeId = currentEmployeeId
    }

    let whereCondition: any = {}
    
    if (startDate && endDate) {
      whereCondition.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }
    
    if (employeeId) {
      whereCondition.employeeId = employeeId
    }

    if (currentUser) {
      whereCondition.employee = {
        user: {
          businessId: currentUser.businessId
        }
      }
    }
    
    const shifts = await prisma.shift.findMany({
      where: whereCondition,
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            department: {
              select: {
                name: true
              }
            }
          }
        },
        employeeGroup: {
          select: {
            name: true
          }
        },
        shiftExchanges: {
          where: {
            status: 'APPROVED'
          },
          include: {
            fromEmployee: {
              select: {
                firstName: true,
                lastName: true,
                department: {
                  select: {
                    name: true
                  }
                }
              }
            },
            toEmployee: {
              select: {
                firstName: true,
                lastName: true,
                department: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    })
    
    return NextResponse.json(shifts)
  } catch (error) {
    console.error('Failed to fetch shifts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch shifts' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser()
    const cookieStore = await cookies()
    const employeeToken = cookieStore.get('employee_token')?.value

    let isAuthorized = false
    let currentEmployeeId = null

    if (currentUser) {
      isAuthorized = true
    }

    if (!isAuthorized && employeeToken) {
      try {
        const decoded = jwt.verify(employeeToken, process.env.JWT_SECRET!) as {
          id: string
          employeeId: string
          type: string
        }

        if (decoded.type === 'employee') {
          isAuthorized = true
          currentEmployeeId = decoded.employeeId
        }
      } catch (error) {
        console.error('Error verifying employee token:', error)
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const rawData = await req.json();
    console.log('Received shift data:', JSON.stringify(rawData, null, 2));

    if (currentUser && rawData.employeeId) {
      const employee = await prisma.employee.findFirst({
        where: {
          id: rawData.employeeId,
          user: {
            businessId: currentUser.businessId
          }
        }
      })

      if (!employee) {
        return NextResponse.json(
          { error: 'Employee not found or access denied' },
          { status: 403 }
        )
      }
    }

    const convertTimeToDateTime = (timeStr: string, baseDate: string): Date => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const date = new Date(baseDate);
      date.setHours(hours, minutes, 0, 0);
      return date;
    };

    const data = {
      ...rawData,
      breakStart: rawData.breakStart ? convertTimeToDateTime(rawData.breakStart, rawData.date) : null,
      breakEnd: rawData.breakEnd ? convertTimeToDateTime(rawData.breakEnd, rawData.date) : null,
    };

    if (!data.endTime) {
      console.log('Creating active shift without endTime');
      const shift = await prisma.shift.create({
        data: {
          ...data,
          date: new Date(data.date),
          endTime: null,
        },
        include: {
          employee: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              mobile: true,
              user: {
                select: {
                  businessId: true
                }
              }
            }
          }
        }
      });

      return NextResponse.json(shift);
    }

    const startHour = parseInt(data.startTime.split(':')[0], 10);
    const endHour = parseInt(data.endTime.split(':')[0], 10);

    if (endHour < startHour) {
      const nextDay = new Date(data.date);
      nextDay.setDate(nextDay.getDate() + 1);

      const firstPart = {
        ...data,
        date: new Date(data.date), // Convert to Date object
        endTime: '23:59', // First part ends at midnight
        breakStart: data.breakStart ? convertTimeToDateTime(rawData.breakStart, rawData.date) : null,
        breakEnd: data.breakEnd ? convertTimeToDateTime(rawData.breakEnd, rawData.date) : null,
      };

      const secondPart = {
        ...data,
        date: nextDay, // Use Date object for the next day
        startTime: '01:00', // Start at midnight
        breakStart: data.breakStart ? convertTimeToDateTime(rawData.breakStart, nextDay.toISOString().split('T')[0]) : null,
        breakEnd: data.breakEnd ? convertTimeToDateTime(rawData.breakEnd, nextDay.toISOString().split('T')[0]) : null,
      };

      const [firstShift, secondShift] = await Promise.all([
        prisma.shift.create({ data: firstPart }),
        prisma.shift.create({ data: secondPart }),
      ]);

      return NextResponse.json([firstShift, secondShift]);
    }

    // If the shift does not span across two days, create it as a single shift
    const shift = await prisma.shift.create({
      data: {
        ...data,
        date: new Date(data.date), // Convert to Date object
      },
    });

    return NextResponse.json(shift);
  } catch (error) {
    console.error('Failed to create shift:', error);
    return NextResponse.json(
      { error: 'Failed to create shift' },
      { status: 500 }
    );
  }
}
