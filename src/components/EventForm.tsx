'use client'

import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface Department {
  id: string
  name: string
}

export interface EventFormData {
  title: string
  description: string
  eventDate: string
  startTime: string
  endTime: string
  location: string
  type: 'MEETING' | 'TRAINING' | 'EVENT'
  status: 'DRAFT' | 'PUBLISHED'
  allDepartments: boolean
  departmentIds: string[]
}

interface EventFormProps {
  initialData?: Partial<EventFormData>
  onSubmit: (data: EventFormData) => Promise<void>
  loading?: boolean
}

export default function EventForm({ initialData, onSubmit, loading = false }: EventFormProps) {
  const { t } = useTranslation()
  const [departments, setDepartments] = useState<Department[]>([])
  const [loadingDepartments, setLoadingDepartments] = useState(true)
  
  const [formData, setFormData] = useState<EventFormData>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    eventDate: initialData?.eventDate || '',
    startTime: initialData?.startTime || '',
    endTime: initialData?.endTime || '',
    location: initialData?.location || '',
    type: initialData?.type || 'EVENT',
    status: initialData?.status || 'DRAFT',
    allDepartments: initialData?.allDepartments ?? false,
    departmentIds: initialData?.departmentIds || [],
  })

  useEffect(() => {
    fetchDepartments()
  }, [])

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments')
      if (res.ok) {
        const data = await res.json()
        setDepartments(data)
      }
    } catch (error) {
      console.error('Failed to fetch departments:', error)
    } finally {
      setLoadingDepartments(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleDepartmentToggle = (deptId: string) => {
    setFormData(prev => ({
      ...prev,
      departmentIds: prev.departmentIds.includes(deptId)
        ? prev.departmentIds.filter(id => id !== deptId)
        : [...prev.departmentIds, deptId]
    }))
  }

  const handleSelectAllDepartments = () => {
    if (formData.departmentIds.length === departments.length) {
      setFormData(prev => ({ ...prev, departmentIds: [] }))
    } else {
      setFormData(prev => ({ ...prev, departmentIds: departments.map(d => d.id) }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          {t('events.form.title')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF]"
          placeholder={t('events.form.title_placeholder')}
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          {t('events.form.description')}
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          rows={3}
          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF]"
          placeholder={t('events.form.description_placeholder')}
        />
      </div>

      {/* Date and Time */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700 mb-1">
            {t('events.form.date')} <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            id="eventDate"
            name="eventDate"
            value={formData.eventDate}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF]"
          />
        </div>
        <div>
          <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
            {t('events.form.start_time')} <span className="text-red-500">*</span>
          </label>
          <input
            type="time"
            id="startTime"
            name="startTime"
            value={formData.startTime}
            onChange={handleChange}
            required
            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF]"
          />
        </div>
        <div>
          <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">
            {t('events.form.end_time')}
          </label>
          <input
            type="time"
            id="endTime"
            name="endTime"
            value={formData.endTime}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF]"
          />
        </div>
      </div>

      {/* Location */}
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
          {t('events.form.location')}
        </label>
        <input
          type="text"
          id="location"
          name="location"
          value={formData.location}
          onChange={handleChange}
          className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF]"
          placeholder={t('events.form.location_placeholder')}
        />
      </div>

      {/* Type and Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
            {t('events.form.type')} <span className="text-red-500">*</span>
          </label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF]"
          >
            <option value="MEETING">{t('events.types.meeting')}</option>
            <option value="TRAINING">{t('events.types.training')}</option>
            <option value="EVENT">{t('events.types.event')}</option>
          </select>
        </div>
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            {t('events.form.status')} <span className="text-red-500">*</span>
          </label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF]"
          >
            <option value="DRAFT">{t('events.status.draft')}</option>
            <option value="PUBLISHED">{t('events.status.published')}</option>
          </select>
        </div>
      </div>

      {/* Departments */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('events.form.departments')}
        </label>
        
        {/* All Departments Toggle */}
        <div className="mb-3">
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              name="allDepartments"
              checked={formData.allDepartments}
              onChange={handleChange}
              className="w-4 h-4 text-[#31BCFF] border-gray-300 rounded focus:ring-[#31BCFF]"
            />
            <span className="ml-2 text-sm text-gray-700">{t('events.form.all_departments')}</span>
          </label>
        </div>

        {/* Department Selection */}
        {!formData.allDepartments && (
          <div className="border border-gray-200 rounded-xl p-4 max-h-48 overflow-y-auto">
            {loadingDepartments ? (
              <div className="text-center text-gray-500 py-2">
                {t('common.loading')}...
              </div>
            ) : departments.length === 0 ? (
              <div className="text-center text-gray-500 py-2">
                {t('events.form.no_departments')}
              </div>
            ) : (
              <>
                <div className="mb-2 pb-2 border-b border-gray-100">
                  <button
                    type="button"
                    onClick={handleSelectAllDepartments}
                    className="text-sm text-[#31BCFF] hover:underline"
                  >
                    {formData.departmentIds.length === departments.length
                      ? t('events.form.deselect_all')
                      : t('events.form.select_all')}
                  </button>
                </div>
                <div className="space-y-2">
                  {departments.map((dept) => (
                    <label key={dept.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.departmentIds.includes(dept.id)}
                        onChange={() => handleDepartmentToggle(dept.id)}
                        className="w-4 h-4 text-[#31BCFF] border-gray-300 rounded focus:ring-[#31BCFF]"
                      />
                      <span className="ml-2 text-sm text-gray-700">{dept.name}</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-[#31BCFF] text-white rounded-xl hover:bg-[#31BCFF]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#31BCFF]/25"
        >
          {loading ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </form>
  )
}
