'use client'

import React, { useState } from 'react'
import { useUser } from '@/shared/lib/useUser'

interface PunchClockFormData {
  note?: string
}

interface PunchClockFormProps {
  initialData?: Partial<PunchClockFormData>
  onSubmit: (data: PunchClockFormData) => void
  onCancel: () => void
  loading: boolean
  employees: { id: string; firstName: string; lastName: string; userId?: string }[]
  employeeGroups: { id: string; name: string }[]
  departments: { id: string; name: string }[]
}

export default function PunchClockForm({
  initialData,
  onSubmit,
  onCancel,
  loading,
  employees,
  employeeGroups,
  departments,
}: PunchClockFormProps) {
  const { user } = useUser()

  const [formData, setFormData] = useState<PunchClockFormData>(() => {
    return {
      note: '',
      ...initialData,
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-6">
        {/* Note */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Note (Optional)</label>
          <textarea
            value={formData.note || ''}
            onChange={(e) => setFormData({ ...formData, note: e.target.value || undefined })}
            rows={4}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-[#31BCFF] focus:ring-[#31BCFF]"
            placeholder="Add a note for this shift (optional)..."
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#31BCFF]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-[#31BCFF] border border-transparent rounded-md hover:bg-[#31BCFF]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#31BCFF] disabled:opacity-50"
        >
          {loading ? 'Clocking In...' : 'Clock In'}
        </button>
      </div>
    </form>
  )
}
