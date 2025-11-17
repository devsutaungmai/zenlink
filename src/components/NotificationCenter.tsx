'use client'

import { useState, useEffect } from 'react'
import { BellIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  data?: any
}

interface NotificationCenterProps {
  employeeId?: string
}

export default function NotificationCenter({ employeeId }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/notifications')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setLoading(false)
    }
  }

  // Fetch notification count
  const fetchNotificationCount = async () => {
    try {
      const response = await fetch('/api/notifications/count')
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error('Failed to fetch notification count:', error)
    }
  }

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      })
      if (response.ok) {
        setNotifications(notifications.map(notif => 
          notif.id === notificationId ? { ...notif, isRead: true } : notif
        ))
        setUnreadCount(Math.max(0, unreadCount - 1))
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      })
      if (response.ok) {
        setNotifications(notifications.map(notif => ({ ...notif, isRead: true })))
        setUnreadCount(0)
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error)
    }
  }

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // Get notification icon based on type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'SHIFT_EXCHANGE_REQUEST':
        return '🔄'
      case 'SHIFT_EXCHANGE_ACCEPTED':
        return '✅'
      case 'SHIFT_EXCHANGE_REJECTED':
        return '❌'
      case 'SHIFT_EXCHANGE_APPROVED':
        return '👍'
      case 'ADMIN_APPROVAL_NEEDED':
        return '⚠️'
      default:
        return '📝'
    }
  }

  useEffect(() => {
    fetchNotifications()
    fetchNotificationCount()

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchNotificationCount()
      if (isOpen) {
        fetchNotifications()
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [isOpen])

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => {
          setIsOpen(!isOpen)
          if (!isOpen) {
            fetchNotifications()
          }
        }}
        className="relative p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
      >
        {unreadCount > 0 ? (
          <BellSolidIcon className="h-6 w-6 text-blue-600" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}
        
        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Panel */}
          <div className="fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-16 sm:top-auto mt-0 sm:mt-2 
                         w-auto sm:w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[calc(100vh-5rem)] sm:max-h-96 overflow-hidden">
            {/* Header */}
            <div className="px-3 sm:px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-medium text-gray-900">Notifications</h3>
              <div className="flex items-center gap-1 sm:gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 whitespace-nowrap"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1"
                >
                  <XMarkIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2">Loading notifications...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <BellIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 sm:p-4 hover:bg-gray-50 transition-colors ${
                        !notification.isRead ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start gap-2 sm:gap-3">
                        <span className="text-lg sm:text-2xl mt-1 flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </span>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-1 gap-2">
                            <h4 className="text-sm font-medium text-gray-900 line-clamp-2">
                              {notification.title}
                            </h4>
                            {!notification.isRead && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="text-blue-600 hover:text-blue-800 flex-shrink-0 p-1"
                                title="Mark as read"
                              >
                                <CheckIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                              </button>
                            )}
                          </div>
                          
                          <p className="text-xs sm:text-sm text-gray-600 mb-2 line-clamp-2">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs text-gray-400 flex-shrink-0">
                              {formatTime(notification.createdAt)}
                            </span>
                            
                            {/* View Details Button */}
                            {notification.data?.shiftExchangeId && (
                              <button
                                onClick={() => {
                                  // Navigate to shift exchange details
                                  // This would open a modal or navigate to a detailed view
                                  console.log('View shift exchange:', notification.data.shiftExchangeId)
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 bg-blue-100 px-2 py-1 rounded whitespace-nowrap"
                              >
                                View Details
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-3 sm:px-4 py-3 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={() => {
                    // Navigate to full notifications page
                    setIsOpen(false)
                    // You can add navigation here
                  }}
                  className="text-xs sm:text-sm text-blue-600 hover:text-blue-800 font-medium w-full text-center py-1"
                >
                  View All Notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
