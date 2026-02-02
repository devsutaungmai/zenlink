'use client'

import React, { useState } from 'react'
import { 
  MapPinIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import { LocationValidationResult, validatePunchLocation } from '@/shared/lib/locationValidation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface LocationValidationModalProps {
  isOpen: boolean
  onClose: () => void
  onValidationSuccess: () => void
  onValidationFailed: (result: LocationValidationResult) => void
  employeeId?: string // Optional employee ID for validation
}

export default function LocationValidationModal({
  isOpen,
  onClose,
  onValidationSuccess,
  onValidationFailed,
  employeeId
}: LocationValidationModalProps) {
  const { t } = useTranslation('punch-clock')
  const [isValidating, setIsValidating] = useState(false)
  const [validationResult, setValidationResult] = useState<LocationValidationResult | null>(null)

  const handleValidateLocation = async () => {
    setIsValidating(true)
    setValidationResult(null)

    try {
      const result = await validatePunchLocation(employeeId)
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

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
      setValidationResult(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <MapPinIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-lg font-semibold text-gray-900">{t('location_modal.title')}</div>
              <p className="text-sm text-gray-600 font-normal">{t('location_modal.subtitle')}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Content */}
        <div className="space-y-4">
          {!validationResult ? (
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                  <MapPinIcon className="w-8 h-8 text-gray-500" />
                </div>
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">
                {t('location_modal.location_required')}
              </h4>
              <p className="text-gray-600 mb-6">
                {t('location_modal.location_required_description')}
              </p>
              <Button
                onClick={handleValidateLocation}
                disabled={isValidating}
                className="w-full"
              >
                {isValidating ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    {t('location_modal.checking_location')}
                  </>
                ) : (
                  <>
                    <MapPinIcon className="w-5 h-5 mr-2" />
                    {t('location_modal.check_my_location')}
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 mt-3">
                {t('location_modal.location_prompt_hint')}
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
                {validationResult.isAllowed ? t('location_modal.location_verified') : t('location_modal.location_not_authorized')}
              </h4>
              
              <p className={`mb-6 ${
                validationResult.isAllowed ? 'text-green-700' : 'text-red-700'
              }`}>
                {validationResult.message}
              </p>

              {validationResult.nearestLocation && validationResult.distance && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
                  <h5 className="text-sm font-medium text-gray-900 mb-2">{t('location_modal.location_details')}</h5>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><span className="font-medium">{t('location_modal.nearest_workplace')}:</span> {validationResult.nearestLocation.name}</p>
                    <p><span className="font-medium">{t('location_modal.your_distance')}:</span> {t('location_modal.distance_away', { distance: validationResult.distance })}</p>
                    <p><span className="font-medium">{t('location_modal.required_range')}:</span> {t('location_modal.within_range', { radius: validationResult.nearestLocation.radius })}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                {!validationResult.isAllowed && (
                  <Button
                    onClick={handleValidateLocation}
                    disabled={isValidating}
                    className="flex-1"
                  >
                    {t('location_modal.try_again')}
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                  className="flex-1"
                >
                  {t('location_modal.close')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
