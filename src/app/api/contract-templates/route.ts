import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/shared/lib/auth'
import { prisma } from '@/shared/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function POST(req: NextRequest) {
  try {
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

    const formData = await req.formData()
    const employeeGroupId = formData.get('employeeGroupId') as string
    const name = formData.get('name') as string
    const body = formData.get('body') as string
    const logoPosition = formData.get('logoPosition') as string
    const logoFile = formData.get('logo') as File | null

    console.log('Received form data:', { employeeGroupId, name, body, logoPosition, logoFile: logoFile?.name })

    if (!employeeGroupId || !name || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify employee group belongs to the user's business
    const employeeGroup = await prisma.employeeGroup.findUnique({
      where: { id: employeeGroupId },
      include: { business: true }
    })

    if (!employeeGroup || employeeGroup.businessId !== userWithBusiness.businessId) {
      return NextResponse.json({ error: 'Employee group not found' }, { status: 404 })
    }

    let logoPath = null

    // Handle logo upload if provided
    if (logoFile) {
      try {
        // Create uploads directory if it doesn't exist
        const uploadsDir = join(process.cwd(), 'public', 'uploads', 'contract-logos')
        await mkdir(uploadsDir, { recursive: true })

        // Generate unique filename
        const fileExtension = logoFile.name.split('.').pop()
        const fileName = `${userWithBusiness.businessId}-${Date.now()}.${fileExtension}`
        const filePath = join(uploadsDir, fileName)

        // Convert file to buffer and save
        const bytes = await logoFile.arrayBuffer()
        const buffer = Buffer.from(bytes)
        await writeFile(filePath, buffer)

        logoPath = `/uploads/contract-logos/${fileName}`
      } catch (error) {
        console.error('Error uploading logo:', error)
        return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 })
      }
    }

    // Map logo position to database enum format
    const logoPositionMap: Record<string, string> = {
      'top-left': 'TOP_LEFT',
      'top-center': 'TOP_CENTER', 
      'top-right': 'TOP_RIGHT',
      'bottom-left': 'BOTTOM_LEFT',
      'bottom-center': 'BOTTOM_CENTER',
      'bottom-right': 'BOTTOM_RIGHT'
    }

    const contractTemplate = await prisma.contractTemplate.create({
      data: {
        name,
        body,
        logoPath,
        logoPosition: logoPositionMap[logoPosition] as any,
        businessId: userWithBusiness.businessId,
        employeeGroupId,
        createdBy: currentUser.id
      },
      include: {
        employeeGroup: {
          select: {
            name: true
          }
        }
      }
    })

    return NextResponse.json(contractTemplate)
  } catch (error) {
    console.error('Error creating contract template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
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

    // Get all contract templates for the business
    const contractTemplates = await prisma.contractTemplate.findMany({
      where: {
        businessId: userWithBusiness.businessId
      },
      include: {
        employeeGroup: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(contractTemplates)
  } catch (error) {
    console.error('Error fetching contract templates:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
