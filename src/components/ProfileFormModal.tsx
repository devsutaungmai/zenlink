'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useTranslation } from 'react-i18next'

interface Department {
  id: string
  name: string
}

interface PunchClockProfile {
  id: string
  name: string
  departmentId: string
  departmentName: string
  isActive: boolean
  createdAt: string
}

interface ProfileFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { name: string; departmentId: string; isActive: boolean }) => Promise<void>
  profile?: PunchClockProfile | null
  departments: Department[]
  loading?: boolean
}

export default function ProfileFormModal({
  isOpen,
  onClose,
  onSave,
  profile,
  departments,
  loading = false
}: ProfileFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    departmentId: '',
    isActive: true
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { t } = useTranslation('settings')

  // Update form data when profile changes
  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name,
        departmentId: profile.departmentId,
        isActive: profile.isActive
      })
    } else {
      setFormData({
        name: '',
        departmentId: '',
        isActive: true
      })
    }
    setErrors({})
  }, [profile])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Profile name is required'
    } else if (formData.name.length < 2) {
      newErrors.name = 'Profile name must be at least 2 characters'
    } else if (formData.name.length > 50) {
      newErrors.name = 'Profile name must be less than 50 characters'
    }

    if (!formData.departmentId) {
      newErrors.departmentId = 'Department is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    try {
      setIsSubmitting(true)
      await onSave(formData)
      handleClose()
    } catch (error) {
      console.error('Error saving profile:', error)
      // You might want to show a toast notification here
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      departmentId: '',
      isActive: true
    })
    setErrors({})
    onClose()
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {profile ? t('punch_clock.profile_setting.modal.title_edit') : t('punch_clock.profile_setting.modal.title_create')}

          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">
              {t('punch_clock.profile_setting.modal.profile_name_label')} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              placeholder="Enter profile name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={isSubmitting}
              className={errors.name ? 'border-red-500 focus:border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">
              {t('punch_clock.profile_setting.modal.department_label')}  <span className="text-red-500">*</span>
            </Label>
            <Select
              value={formData.departmentId}
              onValueChange={(value) => handleInputChange('departmentId', value)}
              disabled={isSubmitting}
            >
              <SelectTrigger className={errors.departmentId ? 'border-red-500 focus:border-red-500' : ''}>
                <SelectValue placeholder={t('punch_clock.profile_setting.modal.department_placeholder')} />
              </SelectTrigger>
              <SelectContent>
                {departments.map((department) => (
                  <SelectItem key={department.id} value={department.id}>
                    {department.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.departmentId && (
              <p className="text-sm text-red-500">{errors.departmentId}</p>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => handleInputChange('isActive', e.target.checked)}
              disabled={isSubmitting}
              className="h-4 w-4 text-[#31BCFF] focus:ring-[#31BCFF] border-gray-300 rounded"
            />
            <div className="space-y-1">
              <Label htmlFor="isActive" className="cursor-pointer">
                {t('punch_clock.profile_setting.modal.active_profile_label')}
              </Label>
              <p className="text-sm text-gray-500">
                {t('punch_clock.profile_setting.modal.active_profile_hint')}
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              {t('punch_clock.profile_setting.modal.button_cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#31BCFF] hover:bg-[#31BCFF]/90"
            >
              {isSubmitting ? t('punch_clock.profile_setting.modal.button_saving') : profile ? t('punch_clock.profile_setting.modal.button_update') : t('punch_clock.profile_setting.modal.button_create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
