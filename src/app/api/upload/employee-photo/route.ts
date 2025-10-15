import { NextRequest, NextResponse } from 'next/server'
import { put, del } from '@vercel/blob'
import { getCurrentUser } from '@/shared/lib/auth'

export const runtime = 'nodejs'

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const oldPhotoUrl = formData.get('oldPhotoUrl') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.' },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 5MB.' },
        { status: 400 }
      )
    }

    // Delete old photo if exists (from Vercel Blob storage)
    if (oldPhotoUrl && oldPhotoUrl.startsWith('https://')) {
      try {
        await del(oldPhotoUrl)
      } catch (error) {
        console.error('Error deleting old photo:', error)
        // Continue even if deletion fails
      }
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split('.').pop()
    const filename = `employee-photos/${timestamp}-${randomString}.${extension}`

    // Upload to Vercel Blob storage
    const blob = await put(filename, file, {
      access: 'public',
      addRandomSuffix: false,
    })

    // Return public URL
    return NextResponse.json({
      success: true,
      url: blob.url,
      filename: blob.pathname,
    })
  } catch (error) {
    console.error('Error uploading photo:', error)
    return NextResponse.json(
      { error: 'Failed to upload photo', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const currentUser = await getCurrentUser()
    if (!currentUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const photoUrl = searchParams.get('url')

    if (!photoUrl) {
      return NextResponse.json(
        { error: 'No photo URL provided' },
        { status: 400 }
      )
    }

    // Delete from Vercel Blob storage
    if (photoUrl.startsWith('https://')) {
      await del(photoUrl)
    }

    return NextResponse.json({
      success: true,
      message: 'Photo deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting photo:', error)
    return NextResponse.json(
      { error: 'Failed to delete photo', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
