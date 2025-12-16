'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { XMarkIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline'
import { format } from 'date-fns'

interface SaveAsTemplateModalProps {
  isOpen: boolean
  onClose: () => void
  shifts: Array<{
    id: string
    date: Date | string
    startTime: string
    endTime: string | null
    employeeId?: string | null
    employeeGroupId?: string | null
    functionId?: string | null
    departmentId?: string | null
    note?: string | null
    [key: string]: any
  }>
  weekStart: Date
  onSave: (templateName: string) => Promise<void>
}

export default function SaveAsTemplateModal({
  isOpen,
  onClose,
  shifts,
  weekStart,
  onSave
}: SaveAsTemplateModalProps) {
  const { t } = useTranslation('schedule')
  const [templateName, setTemplateName] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)

  const handleSave = async () => {
    if (!templateName.trim()) {
      setError(t('templates.name_required', 'Template name is required'))
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await onSave(templateName.trim())
      setTemplateName('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    setTemplateName('')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <DocumentArrowDownIcon className="w-5 h-5 text-[#31BCFF]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {t('templates.save_as_template', 'Save as Template')}
              </h2>
              <p className="text-sm text-gray-500">
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="text-sm text-blue-800">
              <span className="font-semibold">{shifts.length}</span> {t('templates.shifts_will_be_saved', 'shifts will be saved to this template')}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('templates.template_name', 'Template Name')}
            </label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => {
                setTemplateName(e.target.value)
                if (error) setError(null)
              }}
              placeholder={t('templates.enter_name', 'Enter template name...')}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isSaving) {
                  handleSave()
                }
              }}
            />
            {error && (
              <p className="mt-2 text-sm text-red-500">{error}</p>
            )}
          </div>

          <div className="text-xs text-gray-500">
            {t('templates.save_note', 'The template will save shift times, employees, groups, and functions. You can apply this template to any week later.')}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !templateName.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-[#31BCFF] hover:bg-[#28a8e6] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {t('common.saving', 'Saving...')}
              </>
            ) : (
              t('templates.save_template', 'Save Template')
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
