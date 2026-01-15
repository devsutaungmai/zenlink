'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useTranslation } from 'react-i18next'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface Department {
  id: string
  name: string
}

interface PunchClockProfile {
  id: string
  name: string
  departmentIds: string[]
  departmentNames: string[]
  isActive: boolean
  createdAt: string
}

interface ProfileFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: { name: string; departmentIds: string[]; isActive: boolean }) => Promise<void>
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
    departmentIds: [] as string[],
    isActive: true
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { t } = useTranslation('settings')

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name,
        departmentIds: profile.departmentIds || [],
        isActive: profile.isActive
      })
    } else {
      setFormData({
        name: '',
        departmentIds: [],
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

    if (formData.departmentIds.length === 0) {
      newErrors.departmentIds = 'At least one department is required'
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
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      departmentIds: [],
      isActive: true
    })
    setErrors({})
    onClose()
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleDepartmentToggle = (departmentId: string) => {
    setFormData(prev => {
      const isSelected = prev.departmentIds.includes(departmentId)
      const newDepartmentIds = isSelected
        ? prev.departmentIds.filter(id => id !== departmentId)
        : [...prev.departmentIds, departmentId]
      return { ...prev, departmentIds: newDepartmentIds }
    })
    if (errors.departmentIds) {
      setErrors(prev => ({ ...prev, departmentIds: '' }))
    }
  }

  const handleRemoveDepartment = (departmentId: string) => {
    setFormData(prev => ({
      ...prev,
      departmentIds: prev.departmentIds.filter(id => id !== departmentId)
    }))
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
            <Label>
              {t('punch_clock.profile_setting.modal.department_label')}  <span className="text-red-500">*</span>
            </Label>
            
            {formData.departmentIds.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.departmentIds.map(deptId => {
                  const dept = departments.find(d => d.id === deptId)
                  return dept ? (
                    <span
                      key={deptId}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
                    >
                      {dept.name}
                      <button
                        type="button"
                        onClick={() => handleRemoveDepartment(deptId)}
                        className="hover:text-blue-600"
                        disabled={isSubmitting}
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </span>
                  ) : null
                })}
              </div>
            )}
            
            <div className={`border rounded-md p-2 max-h-40 overflow-y-auto ${errors.departmentIds ? 'border-red-500' : 'border-gray-300'}`}>
              {departments.map((department) => (
                <label
                  key={department.id}
                  className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.departmentIds.includes(department.id)}
                    onChange={() => handleDepartmentToggle(department.id)}
                    disabled={isSubmitting}
                    className="h-4 w-4 text-[#31BCFF] focus:ring-[#31BCFF] border-gray-300 rounded"
                  />
                  <span className="text-sm">{department.name}</span>
                </label>
              ))}
            </div>
            {errors.departmentIds && (
              <p className="text-sm text-red-500">{errors.departmentIds}</p>
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
