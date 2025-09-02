// Location validation service for punch clock restrictions
export interface LocationData {
  latitude: number
  longitude: number
  accuracy?: number
}

export interface AllowedLocation {
  id: string
  name: string
  address: string
  latitude: number
  longitude: number
  radius: number // in meters
}

export interface LocationValidationResult {
  isAllowed: boolean
  message: string
  nearestLocation?: AllowedLocation
  distance?: number
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * Get current geolocation with high accuracy
 */
export function getCurrentLocation(): Promise<LocationData> {
  return new Promise((resolve, reject) => {
    console.log('Checking geolocation support...')
    if (!navigator.geolocation) {
      console.error('Geolocation not supported')
      reject(new Error('Geolocation is not supported by this browser'))
      return
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }

    console.log('Requesting current position with options:', options)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('Position received:', position)
        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        }
        console.log('Returning location data:', locationData)
        resolve(locationData)
      },
      (error) => {
        console.error('Geolocation error:', error)
        let message = 'Unable to get your location'
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access denied. Please enable location permissions.'
            break
          case error.POSITION_UNAVAILABLE:
            message = 'Location information is unavailable.'
            break
          case error.TIMEOUT:
            message = 'Location request timed out.'
            break
        }
        console.error('Geolocation error message:', message)
        reject(new Error(message))
      },
      options
    )
  })
}

/**
 * Validate if current location is within allowed areas
 */
export function validateLocation(
  currentLocation: LocationData,
  allowedLocations: AllowedLocation[]
): LocationValidationResult {
  if (allowedLocations.length === 0) {
    return {
      isAllowed: true,
      message: 'No location restrictions configured'
    }
  }

  let nearestLocation: AllowedLocation | undefined
  let shortestDistance = Infinity

  for (const location of allowedLocations) {
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      location.latitude,
      location.longitude
    )

    if (distance < shortestDistance) {
      shortestDistance = distance
      nearestLocation = location
    }

    // Check if within radius
    if (distance <= location.radius) {
      return {
        isAllowed: true,
        message: `You are at ${location.name}`,
        nearestLocation: location,
        distance: Math.round(distance)
      }
    }
  }

  return {
    isAllowed: false,
    message: nearestLocation
      ? `You need to be at your workplace. You are ${Math.round(shortestDistance)}m away from ${nearestLocation.name} (${nearestLocation.radius}m required)`
      : 'You need to be at your workplace',
    nearestLocation,
    distance: Math.round(shortestDistance)
  }
}

/**
 * Fetch punch clock access settings for the business
 */
export async function fetchAccessSettings(): Promise<{
  allowPunchFromAnywhere: boolean
  specificLocations: AllowedLocation[]
}> {
  try {
    console.log('Calling /api/punch-clock/access-settings...')
    const response = await fetch('/api/punch-clock/access-settings')
    console.log('Response status:', response.status, response.statusText)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('API error response:', errorText)
      throw new Error(`Failed to fetch access settings: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log('API response data:', data)
    return data
  } catch (error) {
    console.error('Error fetching access settings:', error)
    // Default to allowing punch from anywhere if we can't fetch settings
    console.log('Defaulting to allow punch from anywhere')
    return {
      allowPunchFromAnywhere: true,
      specificLocations: []
    }
  }
}

/**
 * Fetch punch clock access settings for an employee's business
 */
export async function fetchAccessSettingsForEmployee(employeeId: string): Promise<{
  allowPunchFromAnywhere: boolean
  specificLocations: AllowedLocation[]
}> {
  try {
    console.log(`Calling /api/employee/punch-clock/access-settings?employeeId=${employeeId}...`)
    const response = await fetch(`/api/employee/punch-clock/access-settings?employeeId=${employeeId}`)
    console.log('Response status:', response.status, response.statusText)
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('API error response:', errorText)
      throw new Error(`Failed to fetch access settings for employee: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log('API response data:', data)
    return data
  } catch (error) {
    console.error('Error fetching access settings for employee:', error)
    console.log('Defaulting to allow punch from anywhere')
    return {
      allowPunchFromAnywhere: true,
      specificLocations: []
    }
  }
}

/**
 * Check if employee can punch in/out from current location
 */
export async function validatePunchLocation(employeeId?: string): Promise<LocationValidationResult> {
  try {
    console.log('Starting location validation...')
    
    console.log('Fetching access settings...')
    const settings = employeeId 
      ? await fetchAccessSettingsForEmployee(employeeId)
      : await fetchAccessSettings()
    console.log('Access settings received:', settings)
    
    // If punch from anywhere is allowed, no validation needed
    if (settings.allowPunchFromAnywhere) {
      console.log('Punch from anywhere is allowed')
      return {
        isAllowed: true,
        message: 'Location restrictions disabled'
      }
    }

    // If no specific locations configured, deny access
    if (settings.specificLocations.length === 0) {
      console.log('No specific locations configured')
      return {
        isAllowed: false,
        message: 'No workplace locations have been configured. Contact your administrator.'
      }
    }

    console.log(`Found ${settings.specificLocations.length} specific location(s)`)

    // Get current location
    console.log('Getting current location...')
    const currentLocation = await getCurrentLocation()
    console.log('Current location received:', currentLocation)
    
    // Validate against allowed locations
    console.log('Validating against allowed locations...')
    const result = validateLocation(currentLocation, settings.specificLocations)
    console.log('Validation result:', result)
    
    return result
    
  } catch (error) {
    console.error('Location validation error:', error)
    return {
      isAllowed: false,
      message: error instanceof Error ? error.message : 'Location validation failed'
    }
  }
}
