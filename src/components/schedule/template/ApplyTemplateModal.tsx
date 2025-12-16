'use client'

import { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { format, addDays, subDays, startOfWeek, addWeeks, subWeeks } from 'date-fns'

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

type ExistingShiftsOption = 'update' | 'delete-all' | 'keep'

interface ApplyTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  onApply: (data: {
    templateId: string
    applyToDate: Date
    existingShiftsOption: ExistingShiftsOption
  }) => void
  currentWeekStart: Date
}

export default function ApplyTemplateModal({
  isOpen,
  onClose,
  onApply,
  currentWeekStart
}: ApplyTemplateModalProps) {
  const { t } = useTranslation('schedule')
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Form state
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  const [applyToDate, setApplyToDate] = useState<Date>(new Date())
  const [existingShiftsOption, setExistingShiftsOption] = useState<ExistingShiftsOption>('keep')
  const [isApplying, setIsApplying] = useState(false)

  // Get selected template
  const selectedTemplate = useMemo(() => {
    return templates.find(t => t.id === selectedTemplateId)
  }, [templates, selectedTemplateId])

  useEffect(() => {
    if (isOpen) {
      fetchTemplates()
      setApplyToDate(currentWeekStart)
    }
  }, [isOpen, currentWeekStart])

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

  // Filter templates by search query
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templates
    const query = searchQuery.toLowerCase()
    return templates.filter(t => t.name.toLowerCase().includes(query))
  }, [templates, searchQuery])

  // Navigate date
  const handlePrevDate = () => {
    if (selectedTemplate?.length === 'day') {
      setApplyToDate(prev => subDays(prev, 1))
    } else {
      setApplyToDate(prev => subWeeks(prev, 1))
    }
  }

  const handleNextDate = () => {
    if (selectedTemplate?.length === 'day') {
      setApplyToDate(prev => addDays(prev, 1))
    } else {
      setApplyToDate(prev => addWeeks(prev, 1))
    }
  }

  // Format display date
  const formatDisplayDate = () => {
    if (selectedTemplate?.length === 'day') {
      return format(applyToDate, 'MMM d')
    } else {
      const weekStart = startOfWeek(applyToDate, { weekStartsOn: 0 })
      const weekEnd = addDays(weekStart, 6)
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d')}`
    }
  }

  const handleApply = async () => {
    if (!selectedTemplateId) return
    
    setIsApplying(true)
    try {
      await onApply({
        templateId: selectedTemplateId,
        applyToDate,
        existingShiftsOption
      })
      onClose()
    } catch (error) {
      console.error('Error applying template:', error)
    } finally {
      setIsApplying(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose} />
      
      {/* Side Panel */}
      <div className="relative bg-white shadow-xl w-full max-w-sm h-full overflow-hidden flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('templates.apply_template', 'Apply template')}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {format(currentWeekStart, 'MMM d, yyyy')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('templates.select', 'Select')}
            </label>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#31BCFF]"></div>
              </div>
            ) : error ? (
              <div className="text-center py-4">
                <p className="text-red-500 text-sm">{error}</p>
                <button
                  onClick={fetchTemplates}
                  className="mt-2 text-[#31BCFF] text-sm hover:underline"
                >
                  {t('common.retry', 'Retry')}
                </button>
              </div>
            ) : (
              <div className="relative">
                {/* Search input in dropdown */}
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none appearance-none bg-white pr-10"
                >
                  <option value="">{t('templates.select_template', 'Select a template...')}</option>
                  {filteredTemplates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} - ({template.length === 'week' ? t('templates.length_week', 'Week') : t('templates.length_day', 'Day')})
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          {/* Apply to Date - Only show when template is selected */}
          {selectedTemplate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('templates.apply_to_date', 'Apply to date')}
              </label>
              <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={handlePrevDate}
                  className="px-3 py-2.5 hover:bg-gray-50 border-r border-gray-300 transition-colors"
                >
                  <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
                </button>
                <div className="flex-1 text-center py-2.5 text-sm font-medium text-gray-900">
                  {formatDisplayDate()}
                </div>
                <button
                  onClick={handleNextDate}
                  className="px-3 py-2.5 hover:bg-gray-50 border-l border-gray-300 transition-colors"
                >
                  <ChevronRightIcon className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          )}

          {/* Existing Shifts Options */}
          {selectedTemplate && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('templates.existing_shifts', 'Existing shifts')}
              </label>
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="existingShifts"
                    value="update"
                    checked={existingShiftsOption === 'update'}
                    onChange={() => setExistingShiftsOption('update')}
                    className="mt-0.5 w-4 h-4 text-[#31BCFF] border-gray-300 focus:ring-[#31BCFF]"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    {t('templates.update_existing', 'Update existing, and add new shifts')}
                  </span>
                </label>
                
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="existingShifts"
                    value="delete-all"
                    checked={existingShiftsOption === 'delete-all'}
                    onChange={() => setExistingShiftsOption('delete-all')}
                    className="mt-0.5 w-4 h-4 text-[#31BCFF] border-gray-300 focus:ring-[#31BCFF]"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    {t('templates.delete_all', 'Delete all and add new shifts')}
                  </span>
                </label>
                
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="radio"
                    name="existingShifts"
                    value="keep"
                    checked={existingShiftsOption === 'keep'}
                    onChange={() => setExistingShiftsOption('keep')}
                    className="mt-0.5 w-4 h-4 text-[#31BCFF] border-gray-300 focus:ring-[#31BCFF]"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    {t('templates.keep_existing', 'Keep existing shifts and add new shifts')}
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleApply}
            disabled={!selectedTemplateId || isApplying}
            className="w-full px-4 py-2.5 text-sm font-medium text-white bg-[#31BCFF] hover:bg-[#28a8e6] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isApplying ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {t('common.applying', 'Applying...')}
              </>
            ) : (
              t('templates.apply', 'Apply')
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}
