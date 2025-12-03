import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { XMarkIcon, CalendarDaysIcon, CalendarIcon } from '@heroicons/react/24/outline'

interface CreateTemplateModalProps {
  isOpen: boolean
  onClose: () => void
}

type TemplateLength = 'week' | 'day'

export default function CreateTemplateModal({ isOpen, onClose }: CreateTemplateModalProps) {
  const { t } = useTranslation('schedule')
  const router = useRouter()
  const [name, setName] = useState('')
  const [length, setLength] = useState<TemplateLength>('week')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError(t('templates.error_name_required', 'Template name is required'))
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/schedule-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          length
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create template')
      }

      const template = await response.json()
      onClose()
      router.push(`/dashboard/schedule/template/${template.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setName('')
    setLength('week')
    setError('')
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
      
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {t('templates.create_new', 'Create New Template')}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label htmlFor="template-name" className="block text-sm font-medium text-gray-700 mb-2">
              {t('templates.name_label', 'Template Name')}
            </label>
            <input
              id="template-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('templates.name_placeholder', 'Enter template name...')}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {t('templates.length_label', 'Template Length')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLength('week')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  length === 'week'
                    ? 'border-[#31BCFF] bg-blue-50 text-[#31BCFF]'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <CalendarDaysIcon className="w-8 h-8" />
                <span className="font-medium">{t('templates.length_week', 'Week')}</span>
                <span className="text-xs text-gray-500">{t('templates.length_week_desc', '7 days schedule')}</span>
              </button>

              <button
                type="button"
                onClick={() => setLength('day')}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  length === 'day'
                    ? 'border-[#31BCFF] bg-blue-50 text-[#31BCFF]'
                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                }`}
              >
                <CalendarIcon className="w-8 h-8" />
                <span className="font-medium">{t('templates.length_day', 'Day')}</span>
                <span className="text-xs text-gray-500">{t('templates.length_day_desc', '1 day schedule')}</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 bg-[#31BCFF] text-white rounded-lg font-medium hover:bg-[#28a8e6] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? t('common.saving', 'Saving...') : t('templates.save_and_edit', 'Save & Edit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
