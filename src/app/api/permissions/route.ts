import { NextRequest, NextResponse } from 'next/server'
import { PERMISSION_INFO, getPermissionsByCategory } from '@/shared/lib/permissions'

// GET - Get all available permissions
export async function GET(request: NextRequest) {
  try {
    const grouped = getPermissionsByCategory()
    
    return NextResponse.json({
      permissions: Object.values(PERMISSION_INFO),
      byCategory: grouped
    })
  } catch (error: any) {
    console.error('Error fetching permissions:', error)
    return NextResponse.json({ error: 'Failed to fetch permissions' }, { status: 500 })
  }
}
