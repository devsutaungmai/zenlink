import { NextRequest, NextResponse } from 'next/server'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { getCurrentUser } from '@/shared/lib/auth'
import fs from 'fs'

export const runtime = 'nodejs'

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'employee-photos')

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

    // Delete old photo if exists (from local storage)
    if (oldPhotoUrl && oldPhotoUrl.startsWith('/uploads/employee-photos/')) {
      try {
        const oldFilePath = join(process.cwd(), 'public', oldPhotoUrl)
        await unlink(oldFilePath)
      } catch (error) {
        console.error('Error deleting old photo:', error)
        // Continue even if deletion fails
      }
    }

    // Generate unique filename
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(2, 15)
    const extension = file.name.split('.').pop()
    const filename = `${timestamp}-${randomString}.${extension}`

    // Convert File to Buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Ensure upload directory exists
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true })
    }

    // Save file to public/uploads/employee-photos/
    const filepath = join(UPLOAD_DIR, filename)
    await writeFile(filepath, buffer)

    // Return public URL
    const url = `/uploads/employee-photos/${filename}`

    return NextResponse.json({
      success: true,
      url,
      filename,
    })
    return NextResponse.json({
      success: true,
      url,
      filename,
    })
  } catch (error) {
    console.error('Error uploading photo:', error)
    return NextResponse.json(
      { error: 'Failed to upload photo' },
      { status: 500 }
    )
  }
}

// Delete photo endpoint
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

    // Delete from local storage
    if (photoUrl.startsWith('/uploads/employee-photos/')) {
      const filepath = join(process.cwd(), 'public', photoUrl)
      await unlink(filepath)
    }

    return NextResponse.json({
      success: true,
      message: 'Photo deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting photo:', error)
    return NextResponse.json(
      { error: 'Failed to delete photo' },
      { status: 500 }
    )
  }
}
