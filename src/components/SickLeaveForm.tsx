'use client'

import { useState } from 'react'
import { Upload, X, FileText, Calendar } from 'lucide-react'
import Swal from 'sweetalert2'
import { useTranslation } from 'react-i18next'

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
  const [formData, setFormData] = useState<SickLeaveFormData>(() => ({
    employeeId: initialData?.employeeId || '',
    startDate: initialData?.startDate || '',
    endDate: initialData?.endDate || '',
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

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
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
    <form onSubmit={handleSubmit} className="space-y-6">
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
          <input
            type="date"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF]"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <Calendar className="w-4 h-4 inline mr-1" />
            {t('form.end_date')} <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF]"
            required
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
