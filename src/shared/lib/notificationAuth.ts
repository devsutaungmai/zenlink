import { prisma } from '@/shared/lib/prisma'

export interface NotificationAuthConditions {
  OR?: Array<{ recipientId?: string; recipientUserId?: string }>
}

/**
 * Generates Prisma OR conditions for fetching notifications based on the current user or employee.
 * Admin users might not have employee records, so we query by recipientUserId.
 * Employees query by recipientId (their employee ID).
 */
export async function getNotificationAuthConditions(auth: any): Promise<NotificationAuthConditions | null> {
  if (!auth) return null

  let recipientId: string | null = null
  let userId: string | null = null
  
  if (auth.type === 'user') {
    const user = auth.data
    userId = user.id
    // Admin users may also have an employee record, fetch it just in case
    const employee = await prisma.employee.findFirst({
      where: { userId: user.id }
    })
    if (employee) {
      recipientId = employee.id
    }
  } else {
    // Auth is an employee
    recipientId = auth.data.id
  }

  const orConditions: any[] = []
  if (recipientId) orConditions.push({ recipientId })
  if (userId) orConditions.push({ recipientUserId: userId })

  if (orConditions.length === 0) {
    return null
  }

  return { OR: orConditions }
}
