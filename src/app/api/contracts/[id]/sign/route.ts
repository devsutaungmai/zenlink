import { NextResponse } from "next/server";
import { getCurrentUserOrEmployee } from "@/shared/lib/auth";
import { prisma } from "@/shared/lib/prisma";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    console.log('[CONTRACT_SIGN] Request received for contract:', id);
    
    const auth = await getCurrentUserOrEmployee();
    if (!auth) {
      console.log('[CONTRACT_SIGN] Unauthorized - no auth');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    let businessId: string;
    let signerId: string;
    let isAdmin = false;
    let employeeId: string | null = null;

    if (auth.type === 'user') {
      businessId = (auth.data as any).businessId;
      signerId = (auth.data as any).id;
      isAdmin = true;
    } else {
      businessId = (auth.data as any).user.businessId;
      signerId = (auth.data as any).id;
      employeeId = (auth.data as any).id;
    }

    console.log('[CONTRACT_SIGN] Auth details:', { businessId, signerId, isAdmin });

    const requestBody = await req.json();
    console.log('[CONTRACT_SIGN] Request body:', requestBody);
    
    const { signingType, signatureData, signerRole } = requestBody;

    // Validate signing type
    if (!['MANUAL', 'ELECTRONIC'].includes(signingType)) {
      console.log('[CONTRACT_SIGN] Invalid signing type:', signingType);
      return NextResponse.json(
        { error: 'Invalid signing type' },
        { status: 400 }
      );
    }

    // Get the contract with employee info
    const contract = await prisma.contract.findFirst({
      where: {
        id: id,
        businessId
      },
      include: {
        employee: true,
        contractTemplate: true,
      }
    });

    if (!contract) {
      console.log('[CONTRACT_SIGN] Contract not found:', { id: id, businessId });
      return NextResponse.json(
        { error: 'Contract not found' },
        { status: 404 }
      );
    }

    console.log('[CONTRACT_SIGN] Found contract:', contract.id, 'current status:', contract.signedStatus);

    // Determine who is signing: admin or employee
    const isAdminSigning = signerRole === 'admin' || (isAdmin && !signerRole);
    const isEmployeeSigning = signerRole === 'employee' || (!isAdmin && !signerRole);

    // Validate employee can only sign their own contract
    if (isEmployeeSigning && employeeId && contract.employeeId !== employeeId) {
      return NextResponse.json(
        { error: 'You can only sign your own contract' },
        { status: 403 }
      );
    }

    // Validate employee can only sign after admin has signed
    if (isEmployeeSigning && !contract.adminSignedAt) {
      return NextResponse.json(
        { error: 'Contract must be signed by admin first' },
        { status: 400 }
      );
    }

    let updateData: any = {};
    let newStatus: string;

    if (isAdminSigning) {
      updateData = {
        adminSignatureData: signatureData ? JSON.stringify(signatureData) : null,
        adminSignedAt: new Date(),
        adminSignedById: signerId,
        signedStatus: 'PENDING_EMPLOYEE_SIGNATURE',
      };
      newStatus = 'PENDING_EMPLOYEE_SIGNATURE';

      // Create notification for employee to sign
      await prisma.notification.create({
        data: {
          type: 'CONTRACT_PENDING_SIGNATURE',
          title: 'Contract Ready for Signature',
          message: `Your contract "${contract.contractTemplate.name}" is ready for your signature.`,
          recipientId: contract.employeeId,
          contractId: contract.id,
          data: {
            contractId: contract.id,
            templateName: contract.contractTemplate.name,
          },
        },
      });

      console.log('[CONTRACT_SIGN] Notification created for employee:', contract.employeeId);

    } else if (isEmployeeSigning) {
      const finalStatus = signingType === 'MANUAL' ? 'SIGNED_PAPER' : 'SIGNED_ELECTRONIC';
      updateData = {
        employeeSignatureData: signatureData ? JSON.stringify(signatureData) : null,
        employeeSignedAt: new Date(),
        signedStatus: finalStatus,
        signedAt: new Date(),
        signedBy: signerId,
        signatureData: signatureData ? JSON.stringify(signatureData) : null,
      };
      newStatus = finalStatus;

      // Optionally notify admin that employee has signed
      const adminUser = await prisma.user.findFirst({
        where: { 
          businessId,
          role: { in: ['ADMIN', 'SUPER_ADMIN'] }
        }
      });

      if (adminUser) {
        await prisma.notification.create({
          data: {
            type: 'CONTRACT_SIGNED',
            title: 'Contract Signed',
            message: `${contract.employee.firstName} ${contract.employee.lastName} has signed their contract.`,
            recipientUserId: adminUser.id,
            contractId: contract.id,
            data: {
              contractId: contract.id,
              employeeName: `${contract.employee.firstName} ${contract.employee.lastName}`,
            },
          },
        });
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid signer role' },
        { status: 400 }
      );
    }

    console.log('[CONTRACT_SIGN] Updating contract with status:', newStatus);
    
    const updatedContract = await prisma.contract.update({
      where: { id: id },
      data: updateData,
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
      adminSignedAt: updatedContract.adminSignedAt,
      employeeSignedAt: updatedContract.employeeSignedAt
    });

    return NextResponse.json(updatedContract);
  } catch (error) {
    console.error("[CONTRACT_SIGN]", error);
    return new NextResponse("Internal error", { status: 500 });
  }
}
