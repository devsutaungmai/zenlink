'use client'

import { useState, useEffect } from 'react'
import { 
  MapPinIcon, 
  PlusIcon, 
  TrashIcon,
  ExclamationTriangleIcon,
  BuildingOffice2Icon
} from '@heroicons/react/24/outline'
import GoogleMapsLocationPicker from './GoogleMapsLocationPicker'
import { useTranslation } from 'react-i18next'

interface Department {
  id: string
  name: string
  address: string
  _count?: {
    employees: number
  }
}

interface Location {
  id: string
  name: string
  address: string
  latitude?: number
  longitude?: number
  radius?: number // in meters
  departmentIds?: string[] // Added for department filtering
}

interface PunchClockAccessSettings {
  allowPunchFromAnywhere: boolean
  specificLocations: Location[]
  restrictByDepartment: boolean
  allowedDepartments: string[]
}

export default function PunchClockAccessSettings() {
  const [settings, setSettings] = useState<PunchClockAccessSettings>({
    allowPunchFromAnywhere: true,
    specificLocations: [],
    restrictByDepartment: false,
    allowedDepartments: []
  })
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [newLocation, setNewLocation] = useState({
    name: '',
    address: '',
    radius: 100,
    departmentIds: [] as string[]
  })
  const { t } = useTranslation('settings')

  useEffect(() => {
    Promise.all([
      fetchSettings(),
      fetchDepartments()
    ])
  }, [])

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments')
      if (res.ok) {
        const data = await res.json()
        setDepartments(data)
      } else {
        console.error('Failed to fetch departments')
      }
    } catch (error) {
      console.error('Error fetching departments:', error)
    }
  }

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

  const handleMapLocationSelect = (mapLocation: {
    lat: number
    lng: number
    address: string
    name: string
    radius: number
  }) => {
    const location: Location = {
      id: Date.now().toString(),
      name: mapLocation.name,
      address: mapLocation.address,
      latitude: mapLocation.lat,
      longitude: mapLocation.lng,
      radius: mapLocation.radius,
      departmentIds: [] // Initialize with empty array for department selection
    }

    setSettings(prev => ({
      ...prev,
      specificLocations: [...prev.specificLocations, location]
    }))

    setShowMapPicker(false)
  }

  const removeLocation = (locationId: string) => {
    setSettings(prev => ({
      ...prev,
      specificLocations: prev.specificLocations.filter(loc => loc.id !== locationId)
    }))
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-8">
        <div className="animate-pulse">
          <div className="h-5 sm:h-6 bg-gray-200 rounded w-1/4 mb-3 sm:mb-4"></div>
          <div className="h-3 sm:h-4 bg-gray-200 rounded w-3/4 mb-4 sm:mb-6"></div>
          <div className="h-10 bg-gray-200 rounded mb-3 sm:mb-4"></div>
          <div className="h-10 bg-gray-200 rounded mb-3 sm:mb-4"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
        {t('punch_clock.access_setting.title')}
        </h2>
        <p className="text-sm sm:text-base text-gray-600 mt-1">
      {t('punch_clock.access_setting.description')}
        </p>
      </div>

      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Access Mode Selection */}
        <div>
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2 sm:mb-3">
             {t('punch_clock.access_setting.access_restrictions.title')}
          </h3>
          <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
        {t('punch_clock.access_setting.access_restrictions.description')}
          </p>

          <div className="space-y-2 sm:space-y-3">
            {/* Anywhere Option */}
            <label className="flex items-start space-x-2 sm:space-x-3 cursor-pointer p-3 sm:p-0 rounded-lg hover:bg-gray-50 sm:hover:bg-transparent transition-colors">
              <input
                type="radio"
                name="accessMode"
                checked={settings.allowPunchFromAnywhere}
                onChange={() => handleAccessModeChange(true)}
                className="mt-1 h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0 text-[#31BCFF] border-gray-300 focus:ring-[#31BCFF]"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm sm:text-sm font-medium text-gray-900">
              {t('punch_clock.access_setting.access_restrictions.options.anywhere.label')}
                </div>
                <div className="text-xs sm:text-sm text-gray-500">
              {t('punch_clock.access_setting.access_restrictions.options.anywhere.description')}
                  
                </div>
              </div>
            </label>

            {/* Specific Locations Option */}
            <label className="flex items-start space-x-2 sm:space-x-3 cursor-pointer p-3 sm:p-0 rounded-lg hover:bg-gray-50 sm:hover:bg-transparent transition-colors">
              <input
                type="radio"
                name="accessMode"
                checked={!settings.allowPunchFromAnywhere}
                onChange={() => handleAccessModeChange(false)}
                className="mt-1 h-4 w-4 sm:h-4 sm:w-4 flex-shrink-0 text-[#31BCFF] border-gray-300 focus:ring-[#31BCFF]"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm sm:text-sm font-medium text-gray-900">
              {t('punch_clock.access_setting.access_restrictions.options.specific_locations.label')}
                </div>
                <div className="text-xs sm:text-sm text-gray-500">
                                {t('punch_clock.access_setting.access_restrictions.options.specific_locations.description')}

                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Department Restrictions */}
        <div className="border-t border-gray-200 pt-4 sm:pt-6">
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2 sm:mb-3">
        {t('punch_clock.access_setting.department_access.title')}

          </h3>
          <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
        {t('punch_clock.access_setting.department_access.description')}
          </p>

          <div className="space-y-2 sm:space-y-3">
            <label className="flex items-start space-x-2 sm:space-x-3 cursor-pointer p-3 sm:p-0 rounded-lg hover:bg-gray-50 sm:hover:bg-transparent transition-colors">
              <input
                type="radio"
                name="departmentMode"
                checked={!settings.restrictByDepartment}
                onChange={() => setSettings(prev => ({ ...prev, restrictByDepartment: false, allowedDepartments: [] }))}
                className="mt-1 h-4 w-4 flex-shrink-0 text-[#31BCFF] border-gray-300 focus:ring-[#31BCFF]"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm sm:text-sm font-medium text-gray-900">
              {t('punch_clock.access_setting.department_access.options.all_departments.label')}

                </div>
                <div className="text-xs sm:text-sm text-gray-500">
              {t('punch_clock.access_setting.department_access.options.all_departments.description')}
                </div>
              </div>
            </label>

            <label className="flex items-start space-x-2 sm:space-x-3 cursor-pointer p-3 sm:p-0 rounded-lg hover:bg-gray-50 sm:hover:bg-transparent transition-colors">
              <input
                type="radio"
                name="departmentMode"
                checked={settings.restrictByDepartment}
                onChange={() => setSettings(prev => ({ ...prev, restrictByDepartment: true }))}
                className="mt-1 h-4 w-4 flex-shrink-0 text-[#31BCFF] border-gray-300 focus:ring-[#31BCFF]"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm sm:text-sm font-medium text-gray-900">
              {t('punch_clock.access_setting.department_access.options.specific_departments.label')}

                </div>
                <div className="text-xs sm:text-sm text-gray-500">
              {t('punch_clock.access_setting.department_access.options.specific_departments.description')}
                </div>
              </div>
            </label>
          </div>

          {/* Department Selection */}
          {settings.restrictByDepartment && (
            <div className="mt-3 sm:mt-4 p-3 sm:p-4 border border-gray-200 rounded-lg bg-gray-50">
              <h5 className="text-xs sm:text-sm font-medium text-gray-900 mb-2 sm:mb-3">
                {t('punch_clock.access_setting.allowed_locations.title')}
              </h5>
              <div className="space-y-2 max-h-32 sm:max-h-40 overflow-y-auto">
                                {departments.map((dept) => (
                  <label key={dept.id} className="flex items-center space-x-2 p-2 sm:p-0 rounded hover:bg-white sm:hover:bg-transparent transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.allowedDepartments.includes(dept.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSettings(prev => ({ 
                            ...prev, 
                            allowedDepartments: [...prev.allowedDepartments, dept.id] 
                          }))
                        } else {
                          setSettings(prev => ({ 
                            ...prev, 
                            allowedDepartments: prev.allowedDepartments.filter(id => id !== dept.id) 
                          }))
                        }
                      }}
                      className="h-4 w-4 flex-shrink-0 text-[#31BCFF] border-gray-300 rounded focus:ring-[#31BCFF]"
                    />
                    <span className="text-xs sm:text-sm text-gray-700 min-w-0 break-words">
                      {dept.name}
                      {dept._count?.employees ? (
                        <span className="text-xs text-gray-500 ml-1">
                          ({dept._count.employees} {dept._count.employees === 1 ? t('punch_clock.access_setting.allowed_locations.employee') : t('punch_clock.access_setting.allowed_locations.employees')})
                        </span>
                      ) : null}
                    </span>
                  </label>
                ))}
                {departments.length === 0 && (
                  <p className="text-xs sm:text-sm text-gray-500 p-2">
                    {t('punch_clock.access_setting.allowed_locations.add_form.no_departments')}
                  </p>
                )}
              </div>
              
              {settings.restrictByDepartment && settings.allowedDepartments.length === 0 && (
                <div className="mt-3 p-2 sm:p-3 border border-yellow-200 rounded-lg bg-yellow-50">
                  <div className="flex">
                    <ExclamationTriangleIcon className="h-4 w-4 flex-shrink-0 text-yellow-400 mt-0.5" />
                    <div className="ml-2 min-w-0">
                      <p className="text-xs sm:text-sm text-yellow-700">
                        {t('punch_clock.access_setting.allowed_locations.no_departments_warning')}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Specific Locations Management */}
        {!settings.allowPunchFromAnywhere && (
          <div className="border-t border-gray-200 pt-4 sm:pt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3 sm:mb-4">
              <h4 className="text-sm sm:text-base font-medium text-gray-900">
                {t('punch_clock.access_setting.allowed_locations.title')}
              </h4>
              <button
                onClick={() => setShowMapPicker(true)}
                className="inline-flex items-center justify-center px-3 py-2 border border-transparent text-xs sm:text-sm leading-4 font-medium rounded-md text-white bg-[#31BCFF] hover:bg-[#2ba3e4] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#31BCFF] transition-colors"
              >
                <MapPinIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="whitespace-nowrap">
                  {t('punch_clock.access_setting.allowed_locations.buttons.add_with_map')}
                </span>
              </button>
            </div>

            {/* Existing Locations List */}
            {settings.specificLocations.length > 0 ? (
              <div className="space-y-2 sm:space-y-3">
                {settings.specificLocations.map((location) => (
                  <div
                    key={location.id}
                    className="flex items-start sm:items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg gap-2"
                  >
                    <div className="flex items-start sm:items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                      <div className="relative flex-shrink-0">
                        <MapPinIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                        {location.latitude && location.longitude && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"></div>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{location.name}</div>
                        <div className="text-sm text-gray-500">{location.address}</div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>{t('punch_clock.access_setting.allowed_locations.radius_label')}: {location.radius}m</span>
                          {location.latitude && location.longitude && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              {t('punch_clock.access_setting.allowed_locations.gps_enabled')}
                            </span>
                          )}
                        </div>
                        {/* Department restrictions display */}
                        {location.departmentIds && location.departmentIds.length > 0 && (
                          <div className="flex items-center gap-1 mt-1">
                            <BuildingOffice2Icon className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500">
                              Departments: {location.departmentIds.map(deptId => {
                                const dept = departments.find(d => d.id === deptId)
                                return dept?.name || t('punch_clock.access_setting.allowed_locations.unknown_department')
                              }).join(', ')}
                            </span>
                          </div>
                        )}
                        {(!location.departmentIds || location.departmentIds.length === 0) && (
                          <div className="flex items-center gap-1 mt-1">
                            <BuildingOffice2Icon className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500">{t('punch_clock.access_setting.allowed_locations.all_departments_allowed')}</span>
                          </div>
                        )}
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
              <div className="text-center py-6 sm:py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <MapPinIcon className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
                <h3 className="mt-2 text-xs sm:text-sm font-medium text-gray-900">
                  {t('punch_clock.access_setting.allowed_locations.no_location_text')}
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-gray-500 px-4">
                  {t('punch_clock.access_setting.allowed_locations.description')}
                </p>
              </div>
            )}

            {/* Warning for specific locations */}
            {!settings.allowPunchFromAnywhere && settings.specificLocations.length === 0 && (
              <div className="mt-3 sm:mt-4 p-3 sm:p-4 border border-yellow-200 rounded-lg bg-yellow-50">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 text-yellow-400 mt-0.5" />
                  <div className="ml-2 sm:ml-3 min-w-0">
                    <h3 className="text-xs sm:text-sm font-medium text-yellow-800">
                      {t('punch_clock.access_setting.allowed_locations.warning_title')}
                    </h3>
                    <div className="mt-1 text-xs sm:text-sm text-yellow-700">
                      {t('punch_clock.access_setting.allowed_locations.empty_message')}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Save Button */}
        <div className="flex justify-end pt-4 sm:pt-6 border-t border-gray-200">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 sm:py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#31BCFF] hover:bg-[#2ba3e4] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#31BCFF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? t('punch_clock.access_setting.buttons.saving') : t('punch_clock.access_setting.buttons.save')}
          </button>
        </div>
      </div>

      {/* Google Maps Location Picker */}
      <GoogleMapsLocationPicker
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onLocationSelect={handleMapLocationSelect}
      />
    </div>
  )
}
