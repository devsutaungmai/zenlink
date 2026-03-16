'use client'

import { useEffect, useState } from 'react'
import { Upload, X, FileText, Calendar } from 'lucide-react'
import Swal from 'sweetalert2'
import { useTranslation } from 'react-i18next'
import { DatePicker } from '@/components/ui/date-picker'

interface SickLeaveFormData {
  employeeId?: string
  startDate: string
  endDate: string
  reason?: string
  document?: string
}

interface SickLeaveFormProps {
  initialData?: SickLeaveFormData & { id?: string }
  onSubmit: (data: SickLeaveFormData) => void
  onCancel: () => void
  loading: boolean
  employees?: { id: string; firstName: string; lastName: string; employeeNo?: string }[]
  showEmployeeSelection?: boolean
  isEmployee?: boolean
}

export default function SickLeaveForm({
  initialData,
  onSubmit,
  onCancel,
  loading,
  employees = [],
  showEmployeeSelection = false,
  isEmployee = false
}: SickLeaveFormProps) {
  const { t } = useTranslation('sick-leave')
  const formatDateOnly = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  const parseDateOnly = (value?: string) => {
    if (!value) return undefined
    return new Date(`${value}T00:00:00`)
  }
  const startOfToday = () => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)
    return now
  }
  const addDays = (date: Date, days: number) => {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    return d
  }
  const normalizeDateValue = (value?: string) => {
    if (!value) return ''
    if (value.includes('T')) {
      return value.split('T')[0]
    }
    return value
  }

  const [formData, setFormData] = useState<SickLeaveFormData>(() => ({
    employeeId: initialData?.employeeId || '',
    startDate: normalizeDateValue(initialData?.startDate),
    endDate: normalizeDateValue(initialData?.endDate),
    reason: initialData?.reason || '',
    document: initialData?.document || ''
  }))

  const [uploadedFile, setUploadedFile] = useState<{
    name: string
    url: string
    size: number
  } | null>(initialData?.document ? {
    name: 'Previous document',
    url: initialData.document,
    size: 0
  } : null)
  useEffect(() => {
    setFormData({
      employeeId: initialData?.employeeId || '',
      startDate: normalizeDateValue(initialData?.startDate),
      endDate: normalizeDateValue(initialData?.endDate),
      reason: initialData?.reason || '',
      document: initialData?.document || ''
    })

    if (initialData?.document) {
      setUploadedFile({
        name: 'Previous document',
        url: initialData.document,
        size: 0
      })
    } else {
      setUploadedFile(null)
    }
  }, [initialData])


  const [uploading, setUploading] = useState(false)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload/document', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || t('errors.upload_failed'))
      }

      const result = await response.json()
      setUploadedFile({
        name: result.originalName,
        url: result.url,
        size: result.size
      })

      setFormData(prev => ({
        ...prev,
        document: result.url
      }))

      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'success',
        title: t('success.document_uploaded')
      })
    } catch (error: any) {
      console.error('Upload error:', error)
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'error',
        title: error.message || t('errors.upload_failed')
      })
    } finally {
      setUploading(false)
      // Reset file input
      event.target.value = ''
    }
  }

  const removeFile = () => {
    setUploadedFile(null)
    setFormData(prev => ({
      ...prev,
      document: ''
    }))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.startDate || !formData.endDate) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'error',
        title: t('validation.dates_required')
      })
      return
    }

    const startDate = parseDateOnly(formData.startDate)
    const endDate = parseDateOnly(formData.endDate)

    if (!startDate || !endDate) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'error',
        title: t('validation.dates_required')
      })
      return
    }

    if (endDate < addDays(startDate, 1)) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'error',
        title: t('validation.end_date_before_start')
      })
      return
    }

    if (showEmployeeSelection && !formData.employeeId) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'error',
        title: t('validation.employee_required')
      })
      return
    }

    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Employee Selection (Admin only) */}
      {showEmployeeSelection && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('form.employee')} <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.employeeId}
            onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF]"
            required
          >
            <option value="">{t('form.select_employee')}</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.firstName} {employee.lastName} {employee.employeeNo ? `(${employee.employeeNo})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Date Range */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            {t('form.start_date')} <span className="text-red-500">*</span>
          </label>
          <DatePicker
            date={parseDateOnly(formData.startDate)}
            onDateChange={(d) => {
              if (!d) {
                setFormData({ ...formData, startDate: '', endDate: '' })
                return
              }
              const normalizedStart = new Date(d)
              normalizedStart.setHours(0, 0, 0, 0)
              const nextDay = addDays(normalizedStart, 1)
              setFormData({
                ...formData,
                startDate: formatDateOnly(normalizedStart),
                endDate: formatDateOnly(nextDay)
              })
            }}
            placeholder={t('form.start_date')}
            disabledDates={(date) => date < startOfToday()}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            {t('form.end_date')} <span className="text-red-500">*</span>
          </label>
          <DatePicker
            date={parseDateOnly(formData.endDate)}
            onDateChange={(d) => setFormData({ ...formData, endDate: d ? formatDateOnly(d) : '' })}
            placeholder={t('form.end_date')}
            disabledDates={(date) => {
              const startDate = parseDateOnly(formData.startDate)
              const minEndDate = startDate ? addDays(startDate, 1) : startOfToday()
              return date < minEndDate
            }}
          />
        </div>
      </div>

      {/* Reason */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('form.reason')}
        </label>
        <textarea
          value={formData.reason}
          onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
          rows={3}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF]"
          placeholder={t('form.reason_placeholder')}
        />
      </div>

      {/* Document Upload */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('form.doctor_note')}
        </label>
        <p className="text-xs text-gray-500 mb-3">
          {t('form.upload_description')}
        </p>

        {!uploadedFile ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#31BCFF] transition-colors">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <label htmlFor="document-upload" className="cursor-pointer">
                <span className="mt-2 block text-sm font-medium text-gray-900">
                  {uploading ? t('form.uploading') : t('form.upload_button')}
                </span>
                <input
                  id="document-upload"
                  type="file"
                  className="sr-only"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
        ) : (
          <div className="border border-gray-300 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{uploadedFile.name}</p>
                  {uploadedFile.size > 0 && (
                    <p className="text-xs text-gray-500">{formatFileSize(uploadedFile.size)}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={removeFile}
                className="text-red-500 hover:text-red-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Submit Buttons */}
      <div className="flex justify-end space-x-3 pt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#31BCFF]"
        >
          {t('form.cancel')}
        </button>
        <button
          type="submit"
          disabled={loading || uploading}
          className="px-4 py-2 text-sm font-medium text-white bg-[#31BCFF] border border-transparent rounded-md hover:bg-[#31BCFF]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#31BCFF] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t('form.submitting') : (initialData?.id ? t('form.update') : t('form.submit'))}
        </button>
      </div>
    </form>
  )
}
