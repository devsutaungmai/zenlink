import Pusher from 'pusher'

let pusherInstance: Pusher | null = null

export function getPusherServer(): Pusher | null {
  if (
    !process.env.PUSHER_APP_ID ||
    !process.env.PUSHER_KEY ||
    !process.env.PUSHER_SECRET ||
    !process.env.PUSHER_CLUSTER
  ) {
    return null
  }

  if (!pusherInstance) {
    pusherInstance = new Pusher({
      appId: process.env.PUSHER_APP_ID,
      key: process.env.PUSHER_KEY,
      secret: process.env.PUSHER_SECRET,
      cluster: process.env.PUSHER_CLUSTER,
      useTLS: true,
    })
  }

  return pusherInstance
}

export async function triggerPusherEvent(
  channel: string,
  event: string,
  data: any
): Promise<void> {
  const pusher = getPusherServer()
  if (!pusher) return

  try {
    await pusher.trigger(channel, event, data)
  } catch (error) {
    console.error('Pusher trigger failed:', error)
  }
}

export function getNotificationChannel(recipientId: string): string {
  return `private-notifications-${recipientId}`
}

export function getUserNotificationChannel(userId: string): string {
  return `private-notifications-user-${userId}`
}
