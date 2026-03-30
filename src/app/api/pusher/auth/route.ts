import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUserOrEmployee } from '@/shared/lib/auth'
import { getPusherServer } from '@/shared/lib/pusher-server'
import { prisma } from '@/shared/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const auth = await getCurrentUserOrEmployee()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const pusher = getPusherServer()
    if (!pusher) {
      return NextResponse.json({ error: 'Pusher not configured' }, { status: 500 })
    }

    const body = await request.text()
    const params = new URLSearchParams(body)
    const socketId = params.get('socket_id')
    const channelName = params.get('channel_name')

    if (!socketId || !channelName) {
      return NextResponse.json({ error: 'Missing socket_id or channel_name' }, { status: 400 })
    }

    let authorized = false

    if (auth.type === 'user') {
      const user = auth.data
      if (channelName === `private-notifications-user-${user.id}`) {
        authorized = true
      }
      const employee = await prisma.employee.findFirst({
        where: { userId: user.id },
        select: { id: true },
      })
      if (employee && channelName === `private-notifications-${employee.id}`) {
        authorized = true
      }
    } else {
      const employee = auth.data
      if (channelName === `private-notifications-${employee.id}`) {
        authorized = true
      }
    }

    if (!authorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const authResponse = pusher.authorizeChannel(socketId, channelName)
    return NextResponse.json(authResponse)
  } catch (error) {
    console.error('Pusher auth error:', error)
    return NextResponse.json({ error: 'Auth failed' }, { status: 500 })
  }
}
