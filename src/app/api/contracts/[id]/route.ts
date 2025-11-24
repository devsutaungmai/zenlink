import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contractId = params.id

    // Check if contract exists
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    if (contract.signedStatus && contract.signedStatus !== 'UNSIGNED') {
      return NextResponse.json({ error: 'Signed contracts cannot be deleted' }, { status: 400 })
    }

    // Delete the contract
    await prisma.contract.delete({
      where: { id: contractId },
    })

    return NextResponse.json({ success: true }, { status: 200 })

  } catch (error) {
    console.error('Error deleting contract:', error)
    return NextResponse.json(
      { error: 'Failed to delete contract' }, 
      { status: 500 }
    )
  }
}