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
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'))
      return
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const locationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        }
        resolve(locationData)
      },
      (error) => {
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
    const response = await fetch('/api/punch-clock/access-settings')
    
    if (!response.ok) {
      throw new Error(`Failed to fetch access settings: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    return data
  } catch (error) {
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
    const response = await fetch(`/api/employee/punch-clock/access-settings?employeeId=${employeeId}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch access settings for employee: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    return data
  } catch (error) {
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
    const settings = employeeId 
      ? await fetchAccessSettingsForEmployee(employeeId)
      : await fetchAccessSettings()
      
    if ((settings as any).error) {
      return {
        isAllowed: false,
        message: (settings as any).error
      }
    }

    if (settings.allowPunchFromAnywhere) {
      return {
        isAllowed: true,
        message: 'Location restrictions disabled'
      }
    }

    if (settings.specificLocations.length === 0) {
      return {
        isAllowed: false,
        message: 'No workplace locations have been configured. Contact your administrator.'
      }
    }

    const currentLocation = await getCurrentLocation()
    const result = validateLocation(currentLocation, settings.specificLocations)
    
    return result
    
  } catch (error) {
    return {
      isAllowed: false,
      message: error instanceof Error ? error.message : 'Location validation failed'
    }
  }
}
