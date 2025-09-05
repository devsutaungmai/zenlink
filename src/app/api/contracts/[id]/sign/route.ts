import { NextResponse } from "next/server";
import { getCurrentUserOrEmployee } from "@/lib/auth";
import { prisma } from "@/app/lib/prisma";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    console.log('[CONTRACT_SIGN] Request received for contract:', params.id);
    
    const auth = await getCurrentUserOrEmployee();
    if (!auth) {
      console.log('[CONTRACT_SIGN] Unauthorized - no auth');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let businessId: string;
    let signedBy: string;
    if (auth.type === 'user') {
      businessId = (auth.data as any).businessId;
      signedBy = (auth.data as any).id;
    } else {
      businessId = (auth.data as any).user.businessId;
      signedBy = (auth.data as any).id;
    }

    console.log('[CONTRACT_SIGN] Auth details:', { businessId, signedBy, authType: auth.type });

    const requestBody = await req.json();
    console.log('[CONTRACT_SIGN] Request body:', requestBody);
    
    const { signingType, signatureData } = requestBody;

    // Validate signing type
    if (!['MANUAL', 'ELECTRONIC'].includes(signingType)) {
      console.log('[CONTRACT_SIGN] Invalid signing type:', signingType);
      return NextResponse.json(
        { error: 'Invalid signing type' },
        { status: 400 }
      );
    }

    // Get the contract
    const contract = await prisma.contract.findFirst({
      where: {
        id: params.id,
        businessId
      }
    });

    if (!contract) {
      console.log('[CONTRACT_SIGN] Contract not found:', { id: params.id, businessId });
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      );
    }

    console.log('[CONTRACT_SIGN] Found contract:', contract.id, 'current status:', contract.signedStatus);

    // Update contract with signing information
    const signedStatus = signingType === 'MANUAL' ? 'SIGNED_PAPER' : 'SIGNED_ELECTRONIC';
    
    console.log('[CONTRACT_SIGN] Updating contract with status:', signedStatus);
    
    const updatedContract = await prisma.contract.update({
      where: { id: params.id },
      data: {
        signedStatus,
        signatureData: signatureData ? JSON.stringify(signatureData) : null,
        signedAt: new Date(),
        signedBy,
      },
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
    });

    console.log('[CONTRACT_SIGN] Contract updated successfully:', {
      id: updatedContract.id,
      signedStatus: updatedContract.signedStatus,
      signedAt: updatedContract.signedAt
    });

    return NextResponse.json(updatedContract);
  } catch (error) {
    console.error("[CONTRACT_SIGN]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
