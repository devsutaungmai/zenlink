import { NextResponse } from "next/server";
import { getCurrentUserOrEmployee } from "@/shared/lib/auth";
import { prisma } from "@/shared/lib/prisma";

// Get accessible department IDs based on user's role
async function getAccessibleDepartmentIds(auth: any): Promise<string[] | null> {
  if (auth.type === 'user') {
    const user = auth.data as any

    if (user.role === 'ADMIN') {
      return null // Admins can see all
    }

    if (user.roleId) {
      const userWithRole = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          assignedRole: {
            include: {
              departments: {
                select: { departmentId: true }
              }
            }
          }
        }
      })

      if (userWithRole?.assignedRole?.departments.length) {
        return userWithRole.assignedRole.departments.map(d => d.departmentId)
      }
    }
    
    return null
  } else {
    const employee = auth.data as any
    
    const employeeRoles = await prisma.employeeRole.findMany({
      where: { employeeId: employee.id },
      include: {
        role: {
          include: {
            departments: {
              select: { departmentId: true }
            }
          }
        }
      }
    })

    const departmentSet = new Set<string>()
    let hasUnrestrictedRole = false

    for (const er of employeeRoles) {
      if (er.role.departments.length === 0) {
        hasUnrestrictedRole = true
        break
      }
      for (const d of er.role.departments) {
        departmentSet.add(d.departmentId)
      }
    }

    return hasUnrestrictedRole ? null : Array.from(departmentSet)
  }
}

export async function GET(req: Request) {
  try {
    const auth = await getCurrentUserOrEmployee();
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let businessId: string;
    if (auth.type === 'user') {
      businessId = (auth.data as any).businessId;
    } else {
      businessId = (auth.data as any).user.businessId;
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    // Get accessible department IDs
    const accessibleDepartmentIds = await getAccessibleDepartmentIds(auth);

    const whereClause: any = { businessId };
    
    if (employeeId) {
      whereClause.employeeId = employeeId;
    }

    // If user has department restrictions, filter contracts by employee's department
    if (accessibleDepartmentIds !== null && accessibleDepartmentIds.length > 0) {
      whereClause.employee = {
        OR: [
          { departmentId: { in: accessibleDepartmentIds } },
          { departments: { some: { departmentId: { in: accessibleDepartmentIds } } } }
        ]
      };
    }

    const contracts = await prisma.contract.findMany({
      where: whereClause,
      include: {
        employee: {
          include: {
            department: true
          }
        },
        employeeGroup: true,
        contractTemplate: true,
        contractPerson: true,
      },
      orderBy: {
        startDate: 'desc'
      }
    });

    return NextResponse.json(contracts);
  } catch (error) {
    console.error("[CONTRACTS_GET]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getCurrentUserOrEmployee();
    if (!auth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let businessId: string;
    if (auth.type === 'user') {
      businessId = (auth.data as any).businessId;
    } else {
      businessId = (auth.data as any).user.businessId;
    }
    const values = await req.json();

    const contract = await prisma.contract.create({
      data: {
        businessId,
        ...values,
      },
    });

    return NextResponse.json(contract);
  } catch (error) {
    console.error("[CONTRACTS_POST]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
