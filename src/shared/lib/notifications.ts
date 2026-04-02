import { prisma } from '@/shared/lib/prisma'
import { NotificationType } from '@prisma/client'
import nodemailer from 'nodemailer'
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns'
import { triggerPusherEvent, getNotificationChannel, getUserNotificationChannel } from '@/shared/lib/pusher-server'

// Email configuration
export const createEmailTransporter = () => {
  const provider = (process.env.SMTP_PROVIDER || '').toLowerCase();
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  // Prefer Gmail when configured
  if (provider === 'gmail' || (gmailUser && gmailPass)) {
    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: gmailUser || process.env.SMTP_USER,
        pass: gmailPass || process.env.SMTP_PASS,
      },
    });
  }

  // Generic SMTP (if provided)
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  // Fallback to Mailtrap (dev)
  return nodemailer.createTransport({
    host: 'sandbox.smtp.mailtrap.io',
    port: 2525,
    secure: false, // STARTTLS
    auth: {
      user: process.env.MAILTRAP_USER,
      pass: process.env.MAILTRAP_PASS,
    },
  });
}

// Types for notification data
export interface NotificationData {
  shiftId?: string
  shiftExchangeId?: string
  fromEmployeeName?: string
  toEmployeeName?: string
  shiftDate?: string
  shiftTime?: string
  exchangeType?: string
  reason?: string
  [key: string]: any
}

export interface CreateNotificationParams {
  type: NotificationType
  title: string
  message: string
  recipientId?: string
  recipientUserId?: string
  data?: NotificationData
  shiftId?: string
  shiftExchangeId?: string
  sendEmail?: boolean
  sendSms?: boolean
}

// SMS service with AWS SNS implementation
export class SMSService {
  // Simple phone number validation for international format
  static formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except +
    let formattedNumber = phoneNumber.replace(/[^\d+]/g, '')
  
    if (formattedNumber.startsWith('+')) {
      return formattedNumber
    }
    
    // If somehow it doesn't start with +, add it
    return '+' + formattedNumber
  }

  static async sendSMS(to: string, message: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Initialize AWS SNS client
      const accessKeyId = process.env.AWS_ACCESS_KEY_ID
      const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
      const region = process.env.AWS_REGION || 'ap-southeast-1'
      const senderId = process.env.AWS_SNS_SENDER_ID || 'Zenlink'

      if (!accessKeyId || !secretAccessKey) {
        console.error('AWS SNS configuration missing')
        return { success: false, error: 'SMS service not configured' }
      }

      const snsClient = new SNSClient({
        region,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      })

      // Format phone number using the improved formatting function
      const phoneNumber = this.formatPhoneNumber(to)

      console.log(`SMS Debug - Original: ${to}, Formatted: ${phoneNumber}`)
      console.log(`Sending SMS: "${message}" to ${phoneNumber}`)

      // Send SMS using AWS SNS
      const command = new PublishCommand({
        PhoneNumber: phoneNumber,
        Message: message,
        MessageAttributes: {
          'AWS.SNS.SMS.SenderID': {
            DataType: 'String',
            StringValue: senderId,
          },
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional',
          },
        },
      })

      const result = await snsClient.send(command)
      console.log(`SMS sent successfully via AWS SNS. MessageId: ${result.MessageId}`)
      return { success: true }
    } catch (error: any) {
      console.error('Error sending SMS via AWS SNS:', error)
      return { 
        success: false, 
        error: error.message || 'Failed to send SMS' 
      }
    }
  }
  
  // Generate SMS message for shift exchange request
  static generateShiftExchangeRequestSMS(data: NotificationData): string {
    return `Zenlink: ${data.fromEmployeeName} requests to ${data.exchangeType?.toLowerCase()} shift on ${data.shiftDate} at ${data.shiftTime}. Check your dashboard to respond.`
  }
  
  // Generate SMS message for accepted shift exchange
  static generateShiftExchangeAcceptedSMS(data: NotificationData): string {
    return `Zenlink: ${data.toEmployeeName} accepted your ${data.exchangeType?.toLowerCase()} request for ${data.shiftDate}. Pending admin approval.`
  }
  
  // Generate SMS message for rejected shift exchange
  static generateShiftExchangeRejectedSMS(data: NotificationData): string {
    return `Zenlink: Your ${data.exchangeType?.toLowerCase()} request for ${data.shiftDate} was rejected by ${data.toEmployeeName}.`
  }
  
  // Generate SMS message for approved shift exchange
  static generateShiftExchangeApprovedSMS(data: NotificationData): string {
    return `Zenlink: Your ${data.exchangeType?.toLowerCase()} request for ${data.shiftDate} has been approved! Check your updated schedule.`
  }
  
  // Generate SMS message for admin approval needed
  static generateAdminApprovalNeededSMS(data: NotificationData): string {
    return `Zenlink Admin: ${data.exchangeType} request between ${data.fromEmployeeName} and ${data.toEmployeeName} for ${data.shiftDate} needs approval.`
  }

  // Generate SMS for clock in/out notifications
  static generateClockInSMS(employeeName: string, time: string): string {
    return `Zenlink: ${employeeName} clocked in at ${time}.`
  }

  static generateClockOutSMS(employeeName: string, time: string, duration: string): string {
    return `Zenlink: ${employeeName} clocked out at ${time}. Total worked: ${duration}.`
  }

  // Generate SMS for shift reminders
  static generateShiftReminderSMS(employeeName: string, shiftDate: string, startTime: string): string {
    return `Zenlink: Reminder - You have a shift tomorrow (${shiftDate}) starting at ${startTime}. Don't forget!`
  }

  // Generate SMS for late arrival
  static generateLateArrivalSMS(employeeName: string, expectedTime: string, actualTime: string): string {
    return `Zenlink: ${employeeName} arrived late. Expected: ${expectedTime}, Actual: ${actualTime}.`
  }
}

// Email service
export class EmailService {
  static async sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; error?: string }> {
    try {
      const transporter = createEmailTransporter()
      
      await transporter.sendMail({
        from: process.env.FROM_EMAIL || process.env.GMAIL_USER || 'zenlinkdev@gmail.com',
        to,
        subject,
        html,
      })
      
      return { success: true }
    } catch (error) {
      console.error('Email sending failed:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  static generateShiftExchangeRequestEmail(data: NotificationData): { subject: string; html: string } {
    const subject = `Shift ${data.exchangeType} Request - ${data.shiftDate}`
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #31BCFF;">Shift ${data.exchangeType} Request</h2>
        <p>Hello,</p>
        <p><strong>${data.fromEmployeeName}</strong> has requested to ${data.exchangeType?.toLowerCase()} their shift with you.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Shift Details:</h3>
          <p><strong>Date:</strong> ${data.shiftDate}</p>
          <p><strong>Time:</strong> ${data.shiftTime}</p>
          <p><strong>Type:</strong> ${data.exchangeType}</p>
          ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
        </div>
        
        <p>Please log in to your employee dashboard to review and respond to this request.</p>
        
        <div style="margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/employee/dashboard" 
             style="background-color: #31BCFF; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Request
          </a>
        </div>
        
        <p>Best regards,<br>Zenlink Team</p>
      </div>
    `
    
    return { subject, html }
  }

  static generateShiftExchangeAcceptedEmail(data: NotificationData): { subject: string; html: string } {
    const subject = `Shift ${data.exchangeType} Request Accepted - Pending Admin Approval`
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">Shift ${data.exchangeType} Request Accepted</h2>
        <p>Hello,</p>
        <p><strong>${data.toEmployeeName}</strong> has accepted your shift ${data.exchangeType?.toLowerCase()} request.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Shift Details:</h3>
          <p><strong>Date:</strong> ${data.shiftDate}</p>
          <p><strong>Time:</strong> ${data.shiftTime}</p>
          <p><strong>Type:</strong> ${data.exchangeType}</p>
        </div>
        
        <p>The request is now pending admin approval. You will be notified once the admin reviews the request.</p>
        
        <div style="margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/employee/dashboard" 
             style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Status
          </a>
        </div>
        
        <p>Best regards,<br>Zenlink Team</p>
      </div>
    `
    
    return { subject, html }
  }

  static generateAdminApprovalNeededEmail(data: NotificationData): { subject: string; html: string } {
    const subject = `Shift ${data.exchangeType} Request Needs Approval`
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ffc107;">Shift ${data.exchangeType} Request Needs Approval</h2>
        <p>Hello Admin,</p>
        <p>A shift ${data.exchangeType?.toLowerCase()} request has been accepted by both employees and needs your approval.</p>
        
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Shift Details:</h3>
          <p><strong>From:</strong> ${data.fromEmployeeName}</p>
          <p><strong>To:</strong> ${data.toEmployeeName}</p>
          <p><strong>Date:</strong> ${data.shiftDate}</p>
          <p><strong>Time:</strong> ${data.shiftTime}</p>
          <p><strong>Type:</strong> ${data.exchangeType}</p>
          ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
        </div>
        
        <p>Please review and approve or reject this request in the admin dashboard.</p>
        
        <div style="margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/shifts" 
             style="background-color: #ffc107; color: black; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Review Request
          </a>
        </div>
        
        <p>Best regards,<br>Zenlink System</p>
      </div>
    `
    
    return { subject, html }
  }

  static generateShiftExchangeApprovedEmail(data: NotificationData): { subject: string; html: string } {
    const subject = `Shift ${data.exchangeType} Request Approved - Confirmed`
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #28a745;">✅ Shift ${data.exchangeType} Approved!</h2>
        <p>Great news!</p>
        <p>Your shift ${data.exchangeType?.toLowerCase()} request has been approved by an administrator.</p>
        
        <div style="background-color: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #28a745;">
          <h3 style="color: #155724; margin-top: 0;">Exchange Details:</h3>
          <p><strong>Date:</strong> ${data.shiftDate}</p>
          <p><strong>Time:</strong> ${data.shiftTime}</p>
          <p><strong>Type:</strong> ${data.exchangeType}</p>
          <p><strong>Between:</strong> ${data.fromEmployeeName} ↔ ${data.toEmployeeName}</p>
          ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}
        </div>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; color: #495057;"><strong>What happens next:</strong></p>
          <p style="margin: 5px 0 0 0; color: #6c757d;">The shift assignment has been updated in the system. Please check your schedule to confirm the changes.</p>
        </div>
        
        <div style="margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/employee/dashboard" 
             style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Updated Schedule
          </a>
        </div>
        
        <p>Best regards,<br>Zenlink Team</p>
      </div>
    `
    
    return { subject, html }
  }

  static generateShiftExchangeRejectedByAdminEmail(data: NotificationData): { subject: string; html: string } {
    const subject = `Shift ${data.exchangeType} Request Rejected`
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">❌ Shift ${data.exchangeType} Request Rejected</h2>
        <p>Hello,</p>
        <p>Unfortunately, your shift ${data.exchangeType?.toLowerCase()} request has been rejected by an administrator.</p>
        
        <div style="background-color: #f8d7da; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #dc3545;">
          <h3 style="color: #721c24; margin-top: 0;">Request Details:</h3>
          <p><strong>Date:</strong> ${data.shiftDate}</p>
          <p><strong>Time:</strong> ${data.shiftTime}</p>
          <p><strong>Type:</strong> ${data.exchangeType}</p>
          <p><strong>Between:</strong> ${data.fromEmployeeName} ↔ ${data.toEmployeeName}</p>
          ${data.reason ? `<p><strong>Original Reason:</strong> ${data.reason}</p>` : ''}
        </div>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; color: #495057;"><strong>What happens next:</strong></p>
          <p style="margin: 5px 0 0 0; color: #6c757d;">Your original shift assignment remains unchanged. You can contact your supervisor for more information or submit a new request if circumstances change.</p>
        </div>
        
        <div style="margin: 30px 0;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/employee/dashboard" 
             style="background-color: #6c757d; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
            View Current Schedule
          </a>
        </div>
        
        <p>Best regards,<br>Zenlink Team</p>
      </div>
    `
    
    return { subject, html }
  }
}

// Main notification service
export class NotificationService {
  // Create a notification in the database
  static async createNotification(params: CreateNotificationParams) {
    try {
      const createData: any = {
        type: params.type,
        title: params.title,
        message: params.message,
        data: params.data || {},
        shiftId: params.shiftId || null,
        shiftExchangeId: params.shiftExchangeId || null,
        recipientId: params.recipientId || null,
        recipientUserId: params.recipientUserId || null,
      }

      const notification = await prisma.notification.create({
        data: createData,
        include: {
          recipient: {
            select: {
              email: true,
              mobile: true,
              firstName: true,
              lastName: true,
            },
          },
          recipientUser: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      })

      const recipientEmail = notification.recipient?.email || notification.recipientUser?.email

      // Trigger real-time Pusher event
      const pusherPayload = {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        createdAt: notification.createdAt,
        data: notification.data,
      }

      if (params.recipientId) {
        await triggerPusherEvent(
          getNotificationChannel(params.recipientId),
          'new-notification',
          pusherPayload
        )
      }
      if (params.recipientUserId) {
        await triggerPusherEvent(
          getUserNotificationChannel(params.recipientUserId),
          'new-notification',
          pusherPayload
        )
      }

      // Send email if requested and email is available
      if (params.sendEmail && recipientEmail) {
        const emailResult = await this.sendNotificationEmail(notification)
        
        // Update notification with email status
        await prisma.notification.update({
          where: { id: notification.id },
          data: {
            emailSent: emailResult.success,
            emailSentAt: emailResult.success ? new Date() : null,
            emailError: emailResult.error || null,
          },
        })
      }

      // Send SMS if requested and mobile is available
      if (params.sendSms && notification.recipient?.mobile) {
        const smsResult = await this.sendNotificationSMS(notification)
        
        // Update notification with SMS status
        await prisma.notification.update({
          where: { id: notification.id },
          data: {
            smsSent: smsResult.success,
            smsSentAt: smsResult.success ? new Date() : null,
            smsError: smsResult.error || null,
          },
        })
      }

      return notification
    } catch (error) {
      console.error('Failed to create notification:', error)
      throw error
    }
  }

  // Send email for a notification
  private static async sendNotificationEmail(notification: any): Promise<{ success: boolean; error?: string }> {
    const data = notification.data as NotificationData
    
    let emailContent: { subject: string; html: string }
    
    switch (notification.type) {
      case 'SHIFT_EXCHANGE_REQUEST':
        emailContent = EmailService.generateShiftExchangeRequestEmail(data)
        break
      case 'SHIFT_EXCHANGE_ACCEPTED':
        emailContent = EmailService.generateShiftExchangeAcceptedEmail(data)
        break
      case 'SHIFT_EXCHANGE_APPROVED':
        // Check if this is a notification to admin (needs approval) or to employee (approved)
        if (notification.title.includes('Needs Approval')) {
          emailContent = EmailService.generateAdminApprovalNeededEmail(data)
        } else {
          emailContent = EmailService.generateShiftExchangeApprovedEmail(data)
        }
        break
      case 'SHIFT_EXCHANGE_REJECTED':
        emailContent = EmailService.generateShiftExchangeRejectedByAdminEmail(data)
        break
      default:
        emailContent = {
          subject: notification.title,
          html: `<p>${notification.message}</p>`,
        }
    }
    
    const recipientEmail = notification.recipient?.email || notification.recipientUser?.email
    if (!recipientEmail) {
      return { success: false, error: 'No email address available for recipient' }
    }
    return EmailService.sendEmail(
      recipientEmail,
      emailContent.subject,
      emailContent.html
    )
  }

  // Send SMS for a notification
  private static async sendNotificationSMS(notification: any): Promise<{ success: boolean; error?: string }> {
    try {
      if (!notification.recipient?.mobile) {
        return { success: false, error: 'No mobile number available for recipient' }
      }
      
      let smsMessage = `${notification.title}: ${notification.message}`
      
      // Generate specific SMS messages based on notification type
      if (notification.data) {
        switch (notification.type) {
          case 'SHIFT_EXCHANGE_REQUEST':
            smsMessage = SMSService.generateShiftExchangeRequestSMS(notification.data)
            break
          case 'SHIFT_EXCHANGE_ACCEPTED':
            smsMessage = SMSService.generateShiftExchangeAcceptedSMS(notification.data)
            break
          case 'SHIFT_EXCHANGE_REJECTED':
            smsMessage = SMSService.generateShiftExchangeRejectedSMS(notification.data)
            break
          case 'SHIFT_EXCHANGE_APPROVED':
            smsMessage = SMSService.generateShiftExchangeApprovedSMS(notification.data)
            break
          default:
            // Use default message format for other notification types
            break
        }
      }
      
      return await SMSService.sendSMS(notification.recipient.mobile, smsMessage)
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send SMS' 
      }
    }
  }

  // Get unread notifications for a user
  static async getUnreadNotifications(employeeId: string) {
    return prisma.notification.findMany({
      where: {
        recipientId: employeeId,
        isRead: false,
      },
      include: {
        shiftExchange: {
          include: {
            shift: true,
            fromEmployee: {
              select: { firstName: true, lastName: true },
            },
            toEmployee: {
              select: { firstName: true, lastName: true },
            },
          },
        },
        shift: {
          select: {
            date: true,
            startTime: true,
            endTime: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  // Mark notification as read
  static async markAsRead(notificationId: string) {
    return prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(employeeId: string) {
    return prisma.notification.updateMany({
      where: {
        recipientId: employeeId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })
  }

  // Get notification count for a user
  static async getNotificationCount(employeeId: string) {
    const unreadCount = await prisma.notification.count({
      where: {
        recipientId: employeeId,
        isRead: false,
      },
    })
    
    return { unreadCount }
  }

  // Delete old notifications (cleanup job)
  static async deleteOldNotifications(daysToKeep: number = 30) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
    
    return prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        isRead: true,
      },
    })
  }
}

// Notification helper functions for shift exchanges
export class ShiftExchangeNotifications {
  // Send notification when employee creates a shift exchange request
  static async notifyShiftExchangeRequest(shiftExchangeId: string) {
    const exchange = await prisma.shiftExchange.findUnique({
      where: { id: shiftExchangeId },
      include: {
        shift: true,
        fromEmployee: {
          select: { firstName: true, lastName: true },
        },
        toEmployee: {
          select: { firstName: true, lastName: true, id: true },
        },
      },
    })

    if (!exchange) throw new Error('Shift exchange not found')

    const data: NotificationData = {
      shiftId: exchange.shiftId,
      shiftExchangeId: exchange.id,
      fromEmployeeName: `${exchange.fromEmployee.firstName} ${exchange.fromEmployee.lastName}`,
      toEmployeeName: `${exchange.toEmployee.firstName} ${exchange.toEmployee.lastName}`,
      shiftDate: exchange.shift.date.toLocaleDateString(),
      shiftTime: `${exchange.shift.startTime} - ${exchange.shift.endTime}`,
      exchangeType: exchange.type,
      reason: exchange.reason || undefined,
    }

    return NotificationService.createNotification({
      type: 'SHIFT_EXCHANGE_REQUEST',
      title: `New ${exchange.type} Request`,
      message: `${exchange.fromEmployee.firstName} ${exchange.fromEmployee.lastName} wants to ${exchange.type.toLowerCase()} their shift on ${exchange.shift.date.toLocaleDateString()}`,
      recipientId: exchange.toEmployee.id,
      data,
      shiftId: exchange.shiftId,
      shiftExchangeId: exchange.id,
      sendEmail: true,
      sendSms: true, // SMS enabled
    })
  }

  // Send notification when employee accepts a shift exchange request
  static async notifyShiftExchangeAccepted(shiftExchangeId: string) {
    const exchange = await prisma.shiftExchange.findUnique({
      where: { id: shiftExchangeId },
      include: {
        shift: true,
        fromEmployee: {
          select: { firstName: true, lastName: true, id: true },
        },
        toEmployee: {
          select: { firstName: true, lastName: true },
        },
      },
    })

    if (!exchange) throw new Error('Shift exchange not found')

    const data: NotificationData = {
      shiftId: exchange.shiftId,
      shiftExchangeId: exchange.id,
      fromEmployeeName: `${exchange.fromEmployee.firstName} ${exchange.fromEmployee.lastName}`,
      toEmployeeName: `${exchange.toEmployee.firstName} ${exchange.toEmployee.lastName}`,
      shiftDate: exchange.shift.date.toLocaleDateString(),
      shiftTime: `${exchange.shift.startTime} - ${exchange.shift.endTime}`,
      exchangeType: exchange.type,
      reason: exchange.reason || undefined,
    }

    // Notify the original requester only — admin notification handled by notifyAdminForApproval
    await NotificationService.createNotification({
      type: 'SHIFT_EXCHANGE_ACCEPTED',
      title: `${exchange.type} Request Accepted`,
      message: `${exchange.toEmployee.firstName} ${exchange.toEmployee.lastName} accepted your ${exchange.type.toLowerCase()} request. Waiting for admin approval.`,
      recipientId: exchange.fromEmployee.id,
      data,
      shiftId: exchange.shiftId,
      shiftExchangeId: exchange.id,
      sendEmail: true,
      sendSms: false,
    })
  }

  // Send notification when employee rejects a shift exchange request
  static async notifyShiftExchangeRejected(shiftExchangeId: string) {
    const exchange = await prisma.shiftExchange.findUnique({
      where: { id: shiftExchangeId },
      include: {
        shift: true,
        fromEmployee: {
          select: { firstName: true, lastName: true, id: true },
        },
        toEmployee: {
          select: { firstName: true, lastName: true },
        },
      },
    })

    if (!exchange) throw new Error('Shift exchange not found')

    const data: NotificationData = {
      shiftId: exchange.shiftId,
      shiftExchangeId: exchange.id,
      fromEmployeeName: `${exchange.fromEmployee.firstName} ${exchange.fromEmployee.lastName}`,
      toEmployeeName: `${exchange.toEmployee.firstName} ${exchange.toEmployee.lastName}`,
      shiftDate: exchange.shift.date.toLocaleDateString(),
      shiftTime: `${exchange.shift.startTime} - ${exchange.shift.endTime}`,
      exchangeType: exchange.type,
      reason: exchange.reason || undefined,
    }

    return NotificationService.createNotification({
      type: 'SHIFT_EXCHANGE_REJECTED',
      title: `${exchange.type} Request Rejected`,
      message: `${exchange.toEmployee.firstName} ${exchange.toEmployee.lastName} declined your ${exchange.type.toLowerCase()} request for ${exchange.shift.date.toLocaleDateString()}`,
      recipientId: exchange.fromEmployee.id,
      data,
      shiftId: exchange.shiftId,
      shiftExchangeId: exchange.id,
      sendEmail: true,
      sendSms: false,
    })
  }

  // Send notification to admins when they need to approve an exchange
  static async notifyAdminForApproval(shiftExchangeId: string) {
    const exchange = await prisma.shiftExchange.findUnique({
      where: { id: shiftExchangeId },
      include: {
        shift: true,
        fromEmployee: {
          select: { firstName: true, lastName: true, user: { select: { businessId: true } } },
        },
        toEmployee: {
          select: { firstName: true, lastName: true },
        },
      },
    })

    if (!exchange) throw new Error('Shift exchange not found')

    const businessId = exchange.fromEmployee.user?.businessId
    if (!businessId) throw new Error('Could not determine business for shift exchange')

    const data: NotificationData = {
      shiftId: exchange.shiftId,
      shiftExchangeId: exchange.id,
      fromEmployeeName: `${exchange.fromEmployee.firstName} ${exchange.fromEmployee.lastName}`,
      toEmployeeName: `${exchange.toEmployee.firstName} ${exchange.toEmployee.lastName}`,
      shiftDate: exchange.shift.date.toLocaleDateString(),
      shiftTime: `${exchange.shift.startTime} - ${exchange.shift.endTime}`,
      exchangeType: exchange.type,
      reason: exchange.reason || undefined,
    }

    // Notify admin users belonging to the same business
    const adminUsers = await prisma.user.findMany({
      where: {
        businessId,
        role: 'ADMIN',
      },
      select: { id: true },
    })

    await Promise.all(
      adminUsers.map((adminUser) =>
        NotificationService.createNotification({
          type: 'SHIFT_EXCHANGE_APPROVED',
          title: `${exchange.type} Request Needs Approval`,
          message: `${exchange.fromEmployee.firstName} ${exchange.fromEmployee.lastName} and ${exchange.toEmployee.firstName} ${exchange.toEmployee.lastName} have agreed on a shift ${exchange.type.toLowerCase()}. Please review and approve.`,
          recipientUserId: adminUser.id,
          data,
          shiftId: exchange.shiftId,
          shiftExchangeId: exchange.id,
          sendEmail: true,
          sendSms: false,
        })
      )
    )
  }

  // Send notification to both employees when admin rejects a shift exchange
  static async notifyShiftExchangeRejectedByAdmin(shiftExchangeId: string) {
    const exchange = await prisma.shiftExchange.findUnique({
      where: { id: shiftExchangeId },
      include: {
        shift: true,
        fromEmployee: {
          select: { firstName: true, lastName: true, id: true },
        },
        toEmployee: {
          select: { firstName: true, lastName: true, id: true },
        },
      },
    })

    if (!exchange) throw new Error('Shift exchange not found')

    const data: NotificationData = {
      shiftId: exchange.shiftId,
      shiftExchangeId: exchange.id,
      fromEmployeeName: `${exchange.fromEmployee.firstName} ${exchange.fromEmployee.lastName}`,
      toEmployeeName: `${exchange.toEmployee.firstName} ${exchange.toEmployee.lastName}`,
      shiftDate: exchange.shift.date.toLocaleDateString(),
      shiftTime: `${exchange.shift.startTime} - ${exchange.shift.endTime}`,
      exchangeType: exchange.type,
      reason: exchange.reason || undefined,
    }

    await Promise.all([
      NotificationService.createNotification({
        type: 'SHIFT_EXCHANGE_REJECTED',
        title: `${exchange.type} Request Rejected`,
        message: `Your ${exchange.type.toLowerCase()} request for ${exchange.shift.date.toLocaleDateString()} has been rejected by an administrator.`,
        recipientId: exchange.fromEmployee.id,
        data,
        shiftId: exchange.shiftId,
        shiftExchangeId: exchange.id,
        sendEmail: true,
        sendSms: false,
      }),
      NotificationService.createNotification({
        type: 'SHIFT_EXCHANGE_REJECTED',
        title: `${exchange.type} Request Rejected`,
        message: `The ${exchange.type.toLowerCase()} request you accepted for ${exchange.shift.date.toLocaleDateString()} has been rejected by an administrator.`,
        recipientId: exchange.toEmployee.id,
        data,
        shiftId: exchange.shiftId,
        shiftExchangeId: exchange.id,
        sendEmail: true,
        sendSms: false,
      }),
    ])
  }

  // Send notification when admin approves a shift exchange
  static async notifyShiftExchangeApproved(shiftExchangeId: string) {
    const exchange = await prisma.shiftExchange.findUnique({
      where: { id: shiftExchangeId },
      include: {
        shift: true,
        fromEmployee: {
          select: { firstName: true, lastName: true, id: true },
        },
        toEmployee: {
          select: { firstName: true, lastName: true, id: true },
        },
      },
    })

    if (!exchange) throw new Error('Shift exchange not found')

    const data: NotificationData = {
      shiftId: exchange.shiftId,
      shiftExchangeId: exchange.id,
      fromEmployeeName: `${exchange.fromEmployee.firstName} ${exchange.fromEmployee.lastName}`,
      toEmployeeName: `${exchange.toEmployee.firstName} ${exchange.toEmployee.lastName}`,
      shiftDate: exchange.shift.date.toLocaleDateString(),
      shiftTime: `${exchange.shift.startTime} - ${exchange.shift.endTime}`,
      exchangeType: exchange.type,
      reason: exchange.reason || undefined,
    }

    // Notify both employees that the exchange has been approved
    await Promise.all([
      NotificationService.createNotification({
        type: 'SHIFT_EXCHANGE_APPROVED',
        title: `${exchange.type} Request Approved`,
        message: `Your ${exchange.type.toLowerCase()} request has been approved by an administrator. The shift change is now in effect.`,
        recipientId: exchange.fromEmployee.id,
        data,
        shiftId: exchange.shiftId,
        shiftExchangeId: exchange.id,
        sendEmail: true,
        sendSms: false,
      }),
      NotificationService.createNotification({
        type: 'SHIFT_EXCHANGE_APPROVED',
        title: `${exchange.type} Request Approved`,
        message: `The ${exchange.type.toLowerCase()} request you accepted has been approved by an administrator. The shift change is now in effect.`,
        recipientId: exchange.toEmployee.id,
        data,
        shiftId: exchange.shiftId,
        shiftExchangeId: exchange.id,
        sendEmail: true,
        sendSms: false,
      })
    ])
  }

}

// Notification helper functions for shift requests (open shift requests)
export class ShiftRequestNotifications {
  static async notifyAdminNewShiftRequest(shiftRequestId: string) {
    const shiftRequest = await prisma.shiftRequest.findUnique({
      where: { id: shiftRequestId },
      include: {
        shift: {
          include: {
            function: { select: { name: true } },
            department: { select: { name: true } },
            employeeGroup: { select: { name: true } },
          }
        },
        employee: {
          include: {
            user: { select: { businessId: true } },
          },
        },
      },
    })

    if (!shiftRequest) {
      console.error('[ShiftRequestNotifications] Shift request not found:', shiftRequestId)
      return
    }

    const businessId = shiftRequest.employee.user?.businessId
    if (!businessId) {
      console.error('[ShiftRequestNotifications] No businessId found for employee:', shiftRequest.employee.id)
      return
    }

    const adminUsers = await prisma.user.findMany({
      where: {
        businessId,
        role: 'ADMIN',
      },
      select: { id: true },
    })

    if (adminUsers.length === 0) {
      console.warn('[ShiftRequestNotifications] No admin users found for business:', businessId)
      return
    }

    const employeeName = `${shiftRequest.employee.firstName} ${shiftRequest.employee.lastName}`
    const shiftDate = shiftRequest.shift.date.toLocaleDateString()
    const shiftTime = `${shiftRequest.shift.startTime} - ${shiftRequest.shift.endTime || 'Open'}`
    const functionName = shiftRequest.shift.function?.name || ''

    const data: NotificationData = {
      shiftId: shiftRequest.shiftId,
      shiftRequestId: shiftRequest.id,
      fromEmployeeName: employeeName,
      shiftDate,
      shiftTime,
      functionName,
    }

    const notificationPromises = adminUsers.map(adminUser => 
      NotificationService.createNotification({
        type: 'SHIFT_REQUEST',
        title: 'New Open Shift Request',
        message: `${employeeName} requested an open shift on ${shiftDate} (${shiftTime})${functionName ? ` - ${functionName}` : ''}`,
        recipientUserId: adminUser.id,
        data,
        shiftId: shiftRequest.shiftId,
        sendEmail: false,
        sendSms: false,
      })
      .then(() => console.log('[ShiftRequestNotifications] Notification sent to admin:', adminUser.id))
      .catch(err => console.error('[ShiftRequestNotifications] Failed to create notification for admin:', adminUser.id, err))
    )

    await Promise.all(notificationPromises)
  }
}
