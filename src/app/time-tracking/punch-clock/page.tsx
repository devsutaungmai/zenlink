'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ClockIcon,
  PlayIcon,
  StopIcon,
  ArrowLeftIcon,
  BuildingOfficeIcon,
  UserIcon,
  KeyIcon
} from '@heroicons/react/24/outline'

interface PunchClockProfile {
  id: string
  name: string
  business: {
    id: string
    name: string
    address: string
  }
  departments?: {
    id: string
    name: string
  }[]
  departmentIds?: string[]
}

export default function PunchClockPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<PunchClockProfile | null>(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isWorking, setIsWorking] = useState(false)
  const [punchInTime, setPunchInTime] = useState<Date | null>(null)
  const [workingDuration, setWorkingDuration] = useState('')
  const [loading, setLoading] = useState(false)
  // Location validation temporarily disabled

  useEffect(() => {
    // Check if user has a connected profile
    const storedProfile = localStorage.getItem('punchClockProfile')
    if (!storedProfile) {
      router.push('/time-tracking/activate')
      return
    }

    try {
      const profileData = JSON.parse(storedProfile)
      setProfile(profileData)
      
      // Restore working state if user was punched in
      const storedPunchInTime = localStorage.getItem('punchInTime')
      const storedIsWorking = localStorage.getItem('isWorking')
      
      if (storedIsWorking === 'true' && storedPunchInTime) {
        setIsWorking(true)
        setPunchInTime(new Date(storedPunchInTime))
      }
      
    } catch (error) {
      console.error('Error parsing profile data:', error)
      router.push('/time-tracking/activate')
      return
    }

    // Update current time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timeInterval)
  }, [router])

  useEffect(() => {
    // Update working duration if punched in
    if (isWorking && punchInTime) {
      const diff = currentTime.getTime() - punchInTime.getTime()
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      setWorkingDuration(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
    }
  }, [currentTime, isWorking, punchInTime])

  const handlePunchIn = async () => {
    executePunchAction('in')
  }

  const handlePunchOut = async () => {
    executePunchAction('out')
  }

  const executePunchAction = async (action: 'in' | 'out') => {
    setLoading(true)
    try {
      if (action === 'in') {
        // Implement actual punch in API call here
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        const now = new Date()
        setIsWorking(true)
        setPunchInTime(now)
        
        // Store in localStorage for demo purposes
        localStorage.setItem('punchInTime', now.toISOString())
        localStorage.setItem('isWorking', 'true')
        
        alert('Successfully punched in!')
        
      } else if (action === 'out') {
        // Implement actual punch out API call here
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        setIsWorking(false)
        setPunchInTime(null)
        setWorkingDuration('')
        
        // Clear from localStorage
        localStorage.removeItem('punchInTime')
        localStorage.removeItem('isWorking')
        
        alert(`Punched out successfully! You worked for ${workingDuration}`)
      }
      
    } catch (error) {
      console.error(`Error punching ${action}:`, error)
      alert(`Failed to punch ${action}. Please try again.`)
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = () => {
    if (isWorking) {
      const confirmed = confirm('You are currently punched in. Are you sure you want to disconnect?')
      if (!confirmed) return
    }
    
    localStorage.removeItem('punchClockProfile')
    localStorage.removeItem('punchClockBusiness')
    localStorage.removeItem('punchInTime')
    localStorage.removeItem('isWorking')
    router.push('/time-tracking/activate')
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#31BCFF]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <ClockIcon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
            Punch Clock
          </h1>
          <p className="text-gray-600">
            {profile.name}
          </p>
        </div>

        {/* Profile Info Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-xl p-6 mb-6">
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <BuildingOfficeIcon className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900">{profile.business.name}</div>
                <div className="text-gray-500">{profile.business.address}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <UserIcon className="w-5 h-5 text-gray-400" />
              <div>
                <div className="font-medium text-gray-900">
                  {profile.departments && profile.departments.length > 0 
                    ? profile.departments.map(d => d.name).join(', ')
                    : 'No departments'
                  }
                </div>
                <div className="text-gray-500">Department{profile.departments && profile.departments.length > 1 ? 's' : ''}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Time Display */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-xl p-8 mb-6">
          <div className="text-center">
            <div className="text-4xl font-mono font-bold text-gray-900 mb-2">
              {currentTime.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
              })}
            </div>
            <div className="text-lg text-gray-600">
              {currentTime.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </div>
            
            {/* Working Status */}
            {isWorking && (
              <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-green-700 font-medium">Currently Working</span>
                </div>
                <div className="text-2xl font-mono font-bold text-green-800">
                  {workingDuration}
                </div>
                <div className="text-sm text-green-600 mt-1">
                  Started at {punchInTime?.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Punch Actions */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-xl p-6 mb-6">
          <div className="space-y-4">
            {!isWorking ? (
              <button
                onClick={handlePunchIn}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 text-lg font-semibold text-white bg-gradient-to-r from-green-500 to-green-600 border border-transparent rounded-xl hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    Punching In...
                  </>
                ) : (
                  <>
                    <PlayIcon className="w-6 h-6" />
                    Punch In
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handlePunchOut}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 text-lg font-semibold text-white bg-gradient-to-r from-red-500 to-red-600 border border-transparent rounded-xl hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    Punching Out...
                  </>
                ) : (
                  <>
                    <StopIcon className="w-6 h-6" />
                    Punch Out
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => router.push('/time-tracking')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-gray-600 bg-white/80 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors duration-200"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Back to Dashboard
          </button>
          <button
            onClick={handleDisconnect}
            className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-red-600 bg-white/80 border border-red-300 rounded-xl hover:bg-red-50 transition-colors duration-200"
          >
            <KeyIcon className="w-4 h-4" />
            Disconnect
          </button>
        </div>

        {/* Footer Note */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Your time will be tracked and recorded automatically
          </p>
        </div>
      </div>

    </div>
  )
}
