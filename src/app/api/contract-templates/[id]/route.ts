import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'
import { unlink } from 'fs/promises'
import { join } from 'path'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const currentUser = await getCurrentUser()
    if (!currentUser?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's business
    const userWithBusiness = await prisma.user.findUnique({
      where: { id: currentUser.id },
      include: { business: true }
    })

    if (!userWithBusiness?.businessId) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 })
    }

    const templateId = id

    // Find the contract template and verify it belongs to the user's business
    const contractTemplate = await prisma.contractTemplate.findUnique({
      where: { id: templateId }
    })

    if (!contractTemplate) {
      return NextResponse.json({ error: 'Contract template not found' }, { status: 404 })
    }

    if (contractTemplate.businessId !== userWithBusiness.businessId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Delete logo file if it exists
    if (contractTemplate.logoPath) {
      try {
        const logoFilePath = join(process.cwd(), 'public', contractTemplate.logoPath)
        await unlink(logoFilePath)
      } catch (error) {
        console.warn('Could not delete logo file:', error)
        // Continue with deletion even if file deletion fails
      }
    }

    // Delete the contract template from database
    await prisma.contractTemplate.delete({
      where: { id: templateId }
    })

    return NextResponse.json({ message: 'Contract template deleted successfully' })
  } catch (error) {
    console.error('Error deleting contract template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
