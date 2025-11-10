'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Loader } from '@googlemaps/js-api-loader'
import { MapPinIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface Location {
  lat: number
  lng: number
  address: string
  name: string
}

interface GoogleMapsLocationPickerProps {
  isOpen: boolean
  onClose: () => void
  onLocationSelect: (location: Location & { radius: number }) => void
  initialLocation?: Location
  initialRadius?: number
}

export default function GoogleMapsLocationPicker({
  isOpen,
  onClose,
  onLocationSelect,
  initialLocation,
  initialRadius = 100
}: GoogleMapsLocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markerRef = useRef<google.maps.Marker | null>(null)
  const circleRef = useRef<google.maps.Circle | null>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  
  const [isMapLoaded, setIsMapLoaded] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(initialLocation || null)
  const [radius, setRadius] = useState(initialRadius)
  const [locationName, setLocationName] = useState(initialLocation?.name || '')

  const initializeMap = useCallback(async () => {
    if (!mapRef.current || isMapLoaded) return

    try {
      const loader = new Loader({
        apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
        version: 'weekly',
        libraries: ['places']
      })

      await loader.load()

      const defaultLocation = initialLocation || { lat: 40.7128, lng: -74.0060 } // NYC default

      const map = new google.maps.Map(mapRef.current, {
        center: defaultLocation,
        zoom: 15,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      })

      mapInstanceRef.current = map

      // Initialize autocomplete
      if (searchInputRef.current) {
        const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current, {
          types: ['establishment', 'geocode'],
          fields: ['place_id', 'geometry', 'name', 'formatted_address']
        })

        autocomplete.bindTo('bounds', map)
        autocompleteRef.current = autocomplete

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace()
          if (place.geometry?.location) {
            const location: Location = {
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              address: place.formatted_address || '',
              name: place.name || ''
            }
            handleLocationSelect(location)
            setLocationName(place.name || '')
          }
        })
      }

      // Click listener for map
      map.addListener('click', (event: google.maps.MapMouseEvent) => {
        if (event.latLng) {
          const geocoder = new google.maps.Geocoder()
          geocoder.geocode(
            { location: event.latLng },
            (results, status) => {
              if (status === 'OK' && results?.[0]) {
                const location: Location = {
                  lat: event.latLng!.lat(),
                  lng: event.latLng!.lng(),
                  address: results[0].formatted_address,
                  name: locationName || 'Custom Location'
                }
                handleLocationSelect(location)
              }
            }
          )
        }
      })

      // Initialize with initial location if provided
      if (initialLocation) {
        handleLocationSelect(initialLocation)
        setLocationName(initialLocation.name)
      }

      setIsMapLoaded(true)
    } catch (error) {
      console.error('Error loading Google Maps:', error)
    }
  }, [initialLocation, isMapLoaded, locationName])

  const handleLocationSelect = useCallback((location: Location) => {
    if (!mapInstanceRef.current) return

    setSelectedLocation(location)

    // Clear existing marker and circle
    if (markerRef.current) {
      markerRef.current.setMap(null)
    }
    if (circleRef.current) {
      circleRef.current.setMap(null)
    }

    // Create new marker
    const marker = new google.maps.Marker({
      position: { lat: location.lat, lng: location.lng },
      map: mapInstanceRef.current,
      title: location.name,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#31BCFF',
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: '#ffffff'
      }
    })

    // Create radius circle
    const circle = new google.maps.Circle({
      strokeColor: '#31BCFF',
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: '#31BCFF',
      fillOpacity: 0.15,
      map: mapInstanceRef.current,
      center: { lat: location.lat, lng: location.lng },
      radius: radius
    })

    markerRef.current = marker
    circleRef.current = circle

    // Center map on location
    mapInstanceRef.current.setCenter({ lat: location.lat, lng: location.lng })
  }, [radius])

  const updateRadius = useCallback((newRadius: number) => {
    setRadius(newRadius)
    if (circleRef.current) {
      circleRef.current.setRadius(newRadius)
    }
  }, [])

  const handleSaveLocation = () => {
    if (selectedLocation) {
      onLocationSelect({
        ...selectedLocation,
        name: locationName || selectedLocation.name,
        radius
      })
      onClose()
    }
  }

  useEffect(() => {
    if (isOpen) {
      initializeMap()
    }
  }, [isOpen, initializeMap])

  useEffect(() => {
    if (selectedLocation && isMapLoaded) {
      handleLocationSelect(selectedLocation)
    }
  }, [selectedLocation, isMapLoaded, handleLocationSelect])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-white/80 backdrop-blur-sm">
            <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-full sm:max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <MapPinIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">Select Location</h3>
                <p className="text-xs sm:text-sm text-gray-600 break-words">Search for a location or click on the map</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 flex-shrink-0"
            >
              <XMarkIcon className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col lg:flex-row">
          {/* Map */}
          <div className="flex-1 h-64 sm:h-80 lg:h-[500px]">
            <div ref={mapRef} className="w-full h-full" />
            {!isMapLoaded && (
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <div className="text-center px-4">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-xs sm:text-sm text-gray-600">Loading map...</p>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="w-full lg:w-80 p-4 sm:p-6 border-t lg:border-t-0 lg:border-l border-gray-200 max-h-[40vh] lg:max-h-[500px] overflow-y-auto">
            <div className="space-y-3 sm:space-y-4">
              {/* Search */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Search Location
                </label>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search for a place..."
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                />
              </div>

              {/* Location Name */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Location Name
                </label>
                <input
                  type="text"
                  value={locationName}
                  onChange={(e) => setLocationName(e.target.value)}
                  placeholder="e.g., Main Office, Warehouse"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                />
              </div>

              {/* Radius Control */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Radius: {radius}m
                </label>
                <input
                  type="range"
                  min="10"
                  max="1000"
                  step="10"
                  value={radius}
                  onChange={(e) => updateRadius(parseInt(e.target.value))}
                  className="block w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>10m</span>
                  <span>1000m</span>
                </div>
              </div>

              {/* Selected Location Info */}
              {selectedLocation && (
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <h4 className="text-xs sm:text-sm font-medium text-gray-900 mb-1.5 sm:mb-2">Selected Location</h4>
                  <div className="space-y-1 text-xs sm:text-sm text-gray-600">
                    <p className="break-words"><span className="font-medium">Name:</span> {locationName || selectedLocation.name}</p>
                    <p className="break-all"><span className="font-medium">Address:</span> {selectedLocation.address}</p>
                    <p className="break-all"><span className="font-medium">Coordinates:</span> {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}</p>
                    <p><span className="font-medium">Radius:</span> {radius}m</p>
                  </div>
                </div>
              )}

              {/* Google Maps API Key Warning */}
              {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4">
                  <p className="text-xs sm:text-sm text-yellow-800">
                    Google Maps API key is not configured. Please add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your environment variables.
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-gray-200">
              <button
                onClick={onClose}
                className="flex-1 py-2 sm:py-2.5 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-xs sm:text-sm order-2 sm:order-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveLocation}
                disabled={!selectedLocation || !locationName.trim()}
                className="flex-1 py-2 sm:py-2.5 px-4 bg-[#31BCFF] hover:bg-[#2ba3e4] text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm order-1 sm:order-2"
              >
                Save Location
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #31BCFF;
          cursor: pointer;
          box-shadow: 0 0 2px 0 #555;
        }
        
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #31BCFF;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 2px 0 #555;
        }
      `}</style>
    </div>
  )
}
