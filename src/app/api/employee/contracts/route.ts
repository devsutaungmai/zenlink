import { NextResponse } from 'next/server'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'

export async function GET() {
  try {
    const auth = await getCurrentUserOrEmployee()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let employeeId: string | null = null

    if (auth.type === 'employee') {
      employeeId = (auth.data as any).id
    } else {
      return NextResponse.json({ error: 'This endpoint is for employees only' }, { status: 403 })
    }

    const contracts = await prisma.contract.findMany({
      where: {
        employeeId,
      },
      include: {
        contractTemplate: true,
        employeeGroup: true,
        adminSignedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const pendingSignature = contracts.filter(c => c.signedStatus === 'PENDING_EMPLOYEE_SIGNATURE')
    const signed = contracts.filter(c => ['SIGNED_PAPER', 'SIGNED_ELECTRONIC'].includes(c.signedStatus || ''))
    const unsigned = contracts.filter(c => c.signedStatus === 'UNSIGNED')

    return NextResponse.json({
      all: contracts,
      pendingSignature,
      signed,
      unsigned,
    })
  } catch (error) {
    console.error('Error fetching employee contracts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contracts' },
      { status: 500 }
    )
  }
}
