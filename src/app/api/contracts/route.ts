import { NextResponse } from "next/server";
import { getCurrentUserOrEmployee } from "@/shared/lib/auth";
import { prisma } from "@/shared/lib/prisma";

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

    const whereClause: any = { businessId };
    
    if (employeeId) {
      whereClause.employeeId = employeeId;
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
