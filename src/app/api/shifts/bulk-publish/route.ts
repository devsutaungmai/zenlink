import { NextResponse } from 'next/server'
import { prisma } from '@/shared/lib/prisma'
import { hasAnyServerPermission } from '@/shared/lib/serverPermissions'
import { PERMISSIONS } from '@/shared/lib/permissions'

export async function POST(req: Request) {
  try {
    const canEdit = await hasAnyServerPermission([
      PERMISSIONS.SCHEDULE_EDIT,
      PERMISSIONS.SHIFTS_EDIT,
      PERMISSIONS.SCHEDULE_PUBLISH
    ])

    if (!canEdit) {
      return NextResponse.json(
        { error: 'You do not have permission to publish shifts' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const { shiftIds, publish = true } = body as { shiftIds: string[]; publish?: boolean }

    if (!Array.isArray(shiftIds) || shiftIds.length === 0) {
      return NextResponse.json(
        { error: 'shiftIds must be a non-empty array' },
        { status: 400 }
      )
    }

    const result = await prisma.shift.updateMany({
      where: { id: { in: shiftIds } },
      data: { isPublished: publish },
    })

    return NextResponse.json({ updated: result.count })
  } catch (error) {
    console.error('Failed to bulk publish shifts:', error)
    return NextResponse.json(
      { error: 'Failed to bulk publish shifts' },
      { status: 500 }
    )
  }
}
