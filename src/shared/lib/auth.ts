'use server'

import { auth } from '@/auth'
import { verify } from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { prisma } from '@/shared/lib/prisma'

export async function getCurrentUser() {
  const session = await auth()
  if (!session?.user?.id) return null

  return await prisma.user.findUnique({
    where: { id: session.user.id },
  })
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
  } catch {
    return null
  }
}

export async function getCurrentUserOrEmployee() {
  const user = await getCurrentUser()
  if (user) return { type: 'user', data: user }

  const employee = await getCurrentEmployee()
  if (employee) return { type: 'employee', data: employee }

  return null
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) throw new Error('Not authenticated')
  return user
}

export async function requireAdmin() {
  const user = await getCurrentUser()
  if (!user || user.role !== 'ADMIN') throw new Error('Not authorized')
  return user
}
