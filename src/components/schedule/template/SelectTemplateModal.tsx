'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { XMarkIcon, DocumentTextIcon, CalendarDaysIcon, ClockIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'

interface ScheduleTemplate {
  id: string
  name: string
  length: 'week' | 'day'
  createdAt: string
  updatedAt: string
  _count?: {
    shifts: number
  }
}

interface SelectTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  mode: 'edit' | 'apply'
  onApply?: (templateId: string) => void
}

export default function SelectTemplateModal({
  isOpen,
  onClose,
  mode,
  onApply
}: SelectTemplateModalProps) {
  const { t } = useTranslation('schedule')
  const router = useRouter()
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchTemplates()
    }
  }, [isOpen])

  const fetchTemplates = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/schedule-templates')
      if (!response.ok) {
        throw new Error('Failed to fetch templates')
      }
      const data = await response.json()
      setTemplates(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (templateId: string) => {
    setSelectedTemplateId(templateId)
  }

  const handleConfirm = () => {
    if (!selectedTemplateId) return

    if (mode === 'edit') {
      router.push(`/dashboard/schedule/template/${selectedTemplateId}`)
      onClose()
    } else if (mode === 'apply' && onApply) {
      onApply(selectedTemplateId)
      onClose()
    }
  }

  const handleDoubleClick = (templateId: string) => {
    if (mode === 'edit') {
      router.push(`/dashboard/schedule/template/${templateId}`)
      onClose()
    } else if (mode === 'apply' && onApply) {
      onApply(templateId)
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {mode === 'edit' 
              ? t('templates.select_to_edit', 'Select Template to Edit')
              : t('templates.select_to_apply', 'Select Template to Apply')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#31BCFF]"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-500">{error}</p>
              <button
                onClick={fetchTemplates}
                className="mt-4 text-[#31BCFF] hover:underline"
              >
                {t('common.retry', 'Retry')}
              </button>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                {t('templates.no_templates', 'No templates found')}
              </p>
              <p className="text-sm text-gray-400 mt-1">
                {t('templates.no_templates_desc', 'Create a template first to get started')}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelect(template.id)}
                  onDoubleClick={() => handleDoubleClick(template.id)}
                  className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                    selectedTemplateId === template.id
                      ? 'border-[#31BCFF] bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <DocumentTextIcon className={`w-5 h-5 flex-shrink-0 ${
                          selectedTemplateId === template.id ? 'text-[#31BCFF]' : 'text-gray-400'
                        }`} />
                        <span className="font-medium text-gray-900 truncate">
                          {template.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <CalendarDaysIcon className="w-3.5 h-3.5" />
                          {template.length === 'week' 
                            ? t('templates.length_week', 'Week')
                            : t('templates.length_day', 'Day')}
                        </span>
                        {template._count && (
                          <span>
                            {template._count.shifts} {t('templates.shifts', 'shifts')}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-3.5 h-3.5" />
                          {format(new Date(template.updatedAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedTemplateId}
            className="px-4 py-2 text-sm font-medium text-white bg-[#31BCFF] hover:bg-[#28a8e6] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mode === 'edit'
              ? t('templates.edit_template', 'Edit Template')
              : t('templates.apply_template', 'Apply Template')}
          </button>
        </div>
      </div>
    </div>
  )
}
