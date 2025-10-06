'use server'

import { verify } from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { prisma } from '@/app/lib/prisma'

export async function getCurrentUser() {
  const store = await cookies() 
  const token = store.get('token')?.value

  if (!token) return null

  try {
    const decoded = verify(token, process.env.JWT_SECRET!) as {
      id: string
      role: string
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
    })
    return user
  } catch (error) {
    return null
  }
}

export async function getCurrentEmployee() {
  const store = await cookies()
  const employeeToken = store.get('employee_token')?.value

  if (!employeeToken) return null

  try {
    const decoded = verify(employeeToken, process.env.JWT_SECRET!) as {
      id: string
      userId: string
      employeeId: string
      role: string
      type: string
    }

    if (decoded.type !== 'employee') return null

    return await prisma.employee.findUnique({
      where: { id: decoded.employeeId },
      include: {
        user: true,
        department: true,
        employeeGroup: true,
      },
    })
  } catch (error) {
    return null
  }
}

export async function getCurrentUserOrEmployee() {
  // Try admin authentication first
  const user = await getCurrentUser()
  if (user) {
    return { type: 'user', data: user }
  }

  // Try employee authentication
  const employee = await getCurrentEmployee()
  if (employee) {
    return { type: 'employee', data: employee }
  }

  return null
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Not authenticated')
  }
  return user
}

export async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') {
    throw new Error('Not authorized')
  }
  return user
}
