'use client'

import { useState, useEffect } from 'react'
import { 
  MapPinIcon, 
  PlusIcon, 
  TrashIcon,
  ExclamationTriangleIcon 
} from '@heroicons/react/24/outline'

interface Location {
  id: string
  name: string
  address: string
  latitude?: number
  longitude?: number
  radius?: number // in meters
}

interface PunchClockAccessSettings {
  allowPunchFromAnywhere: boolean
  specificLocations: Location[]
}

export default function PunchClockAccessSettings() {
  const [settings, setSettings] = useState<PunchClockAccessSettings>({
    allowPunchFromAnywhere: true,
    specificLocations: []
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showAddLocation, setShowAddLocation] = useState(false)
  const [newLocation, setNewLocation] = useState({
    name: '',
    address: '',
    radius: 100
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/punch-clock/access-settings')
      if (res.ok) {
        const data = await res.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Error fetching access settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    try {
      setSaving(true)
      const res = await fetch('/api/punch-clock/access-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings)
      })
      
      if (res.ok) {
        // Show success message
        console.log('Settings saved successfully')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleAccessModeChange = (allowAnywhere: boolean) => {
    setSettings(prev => ({
      ...prev,
      allowPunchFromAnywhere: allowAnywhere
    }))
  }

  const addLocation = () => {
    if (!newLocation.name.trim() || !newLocation.address.trim()) {
      return
    }

    const location: Location = {
      id: Date.now().toString(),
      name: newLocation.name.trim(),
      address: newLocation.address.trim(),
      radius: newLocation.radius
    }

    setSettings(prev => ({
      ...prev,
      specificLocations: [...prev.specificLocations, location]
    }))

    setNewLocation({ name: '', address: '', radius: 100 })
    setShowAddLocation(false)
  }

  const removeLocation = (locationId: string) => {
    setSettings(prev => ({
      ...prev,
      specificLocations: prev.specificLocations.filter(loc => loc.id !== locationId)
    }))
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-6"></div>
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
          <div className="h-10 bg-gray-200 rounded mb-4"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Punch Clock Access</h2>
        <p className="text-gray-600 mt-1">Configure where employees can punch in and out</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Access Mode Selection */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Access Restrictions</h3>
          <p className="text-sm text-gray-600 mb-4">
            Enable employees to punch-in and out of a shift from the device
          </p>

          <div className="space-y-3">
            {/* Anywhere Option */}
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="radio"
                name="accessMode"
                checked={settings.allowPunchFromAnywhere}
                onChange={() => handleAccessModeChange(true)}
                className="mt-1 h-4 w-4 text-[#31BCFF] border-gray-300 focus:ring-[#31BCFF]"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">Anywhere</div>
                <div className="text-sm text-gray-500">
                  Employees can punch in/out from any location
                </div>
              </div>
            </label>

            {/* Specific Locations Option */}
            <label className="flex items-start space-x-3 cursor-pointer">
              <input
                type="radio"
                name="accessMode"
                checked={!settings.allowPunchFromAnywhere}
                onChange={() => handleAccessModeChange(false)}
                className="mt-1 h-4 w-4 text-[#31BCFF] border-gray-300 focus:ring-[#31BCFF]"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">Specific locations</div>
                <div className="text-sm text-gray-500">
                  Restrict punch in/out to predefined locations
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Specific Locations Management */}
        {!settings.allowPunchFromAnywhere && (
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-gray-900">Allowed Locations</h4>
              <button
                onClick={() => setShowAddLocation(true)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-[#31BCFF] hover:bg-[#2ba3e4] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#31BCFF] transition-colors"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Location
              </button>
            </div>

            {/* Existing Locations List */}
            {settings.specificLocations.length > 0 ? (
              <div className="space-y-3">
                {settings.specificLocations.map((location) => (
                  <div
                    key={location.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <MapPinIcon className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{location.name}</div>
                        <div className="text-sm text-gray-500">{location.address}</div>
                        <div className="text-xs text-gray-400">
                          Radius: {location.radius}m
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeLocation(location.id)}
                      className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <MapPinIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No locations added</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Add locations where employees can punch in/out
                </p>
              </div>
            )}

            {/* Add Location Form */}
            {showAddLocation && (
              <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <h5 className="text-sm font-medium text-gray-900 mb-3">Add New Location</h5>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location Name
                    </label>
                    <input
                      type="text"
                      value={newLocation.name}
                      onChange={(e) => setNewLocation(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g., Main Office, Warehouse"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#31BCFF] focus:border-[#31BCFF] sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address
                    </label>
                    <input
                      type="text"
                      value={newLocation.address}
                      onChange={(e) => setNewLocation(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Enter full address"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#31BCFF] focus:border-[#31BCFF] sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Radius (meters)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="1000"
                      value={newLocation.radius}
                      onChange={(e) => setNewLocation(prev => ({ ...prev, radius: parseInt(e.target.value) || 100 }))}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#31BCFF] focus:border-[#31BCFF] sm:text-sm"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Employees must be within this distance to punch in/out
                    </p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={addLocation}
                      disabled={!newLocation.name.trim() || !newLocation.address.trim()}
                      className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-[#31BCFF] hover:bg-[#2ba3e4] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#31BCFF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Add Location
                    </button>
                    <button
                      onClick={() => {
                        setShowAddLocation(false)
                        setNewLocation({ name: '', address: '', radius: 100 })
                      }}
                      className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#31BCFF] transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Warning for specific locations */}
            {!settings.allowPunchFromAnywhere && settings.specificLocations.length === 0 && (
              <div className="mt-4 p-4 border border-yellow-200 rounded-lg bg-yellow-50">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      No locations configured
                    </h3>
                    <div className="mt-1 text-sm text-yellow-700">
                      Employees won't be able to punch in/out until you add at least one location.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-6 border-t border-gray-200">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#31BCFF] hover:bg-[#2ba3e4] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#31BCFF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
