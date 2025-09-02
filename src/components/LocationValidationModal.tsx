'use client'

import React, { useState } from 'react'
import { 
  MapPinIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'
import { LocationValidationResult, validatePunchLocation } from '@/lib/locationValidation'

interface LocationValidationModalProps {
  isOpen: boolean
  onClose: () => void
  onValidationSuccess: () => void
  onValidationFailed: (result: LocationValidationResult) => void
}

export default function LocationValidationModal({
  isOpen,
  onClose,
  onValidationSuccess,
  onValidationFailed
}: LocationValidationModalProps) {
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<LocationValidationResult | null>(null)

  const handleValidateLocation = async () => {
    setIsValidating(true)
    setValidationResult(null)

    try {
      const result = await validatePunchLocation()
      setValidationResult(result)

      if (result.isAllowed) {
        onValidationSuccess()
        onClose()
      } else {
        onValidationFailed(result)
      }
    } catch (error) {
      const errorResult: LocationValidationResult = {
        isAllowed: false,
        message: error instanceof Error ? error.message : 'Location validation failed'
      }
      setValidationResult(errorResult)
      onValidationFailed(errorResult)
    } finally {
      setIsValidating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-200 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <MapPinIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Location Verification</h3>
                <p className="text-sm text-gray-600">Verify you're at your workplace</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {!validationResult ? (
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                  <MapPinIcon className="w-8 h-8 text-gray-500" />
                </div>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                Location Required
              </h4>
              <p className="text-gray-600 mb-6">
                To punch in/out, we need to verify you're at an authorized workplace location. 
                This helps ensure accurate time tracking.
              </p>
              <button
                onClick={handleValidateLocation}
                disabled={isValidating}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#31BCFF] hover:bg-[#2ba3e4] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isValidating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Checking Location...
                  </>
                ) : (
                  <>
                    <MapPinIcon className="w-5 h-5" />
                    Check My Location
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 mt-3">
                You may be prompted to allow location access
              </p>
            </div>
          ) : (
            <div className="text-center">
              <div className="mb-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${
                  validationResult.isAllowed 
                    ? 'bg-green-100' 
                    : 'bg-red-100'
                }`}>
                  {validationResult.isAllowed ? (
                    <CheckCircleIcon className="w-8 h-8 text-green-600" />
                  ) : (
                    <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
                  )}
                </div>
              </div>
              
              <h4 className={`text-lg font-medium mb-2 ${
                validationResult.isAllowed ? 'text-green-900' : 'text-red-900'
              }`}>
                {validationResult.isAllowed ? 'Location Verified' : 'Location Not Authorized'}
              </h4>
              
              <p className={`mb-6 ${
                validationResult.isAllowed ? 'text-green-700' : 'text-red-700'
              }`}>
                {validationResult.message}
              </p>

              {validationResult.nearestLocation && validationResult.distance && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">Location Details</h5>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><span className="font-medium">Nearest workplace:</span> {validationResult.nearestLocation.name}</p>
                    <p><span className="font-medium">Your distance:</span> {validationResult.distance}m away</p>
                    <p><span className="font-medium">Required range:</span> Within {validationResult.nearestLocation.radius}m</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                {!validationResult.isAllowed && (
                  <button
                    onClick={handleValidateLocation}
                    disabled={isValidating}
                    className="flex-1 px-4 py-2 bg-[#31BCFF] hover:bg-[#2ba3e4] text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    Try Again
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
