'use client'

import { useState } from 'react'
import { ChevronUpIcon, ChevronDownIcon, InformationCircleIcon } from '@heroicons/react/24/outline'

interface CustomerPaymentTermProps {
  onSettingsChange?: (settings: CustomerPaymentTerm) => void
  defaultValues?: CustomerPaymentTerm
}

export interface CustomerPaymentTerm {
  dueDateType: 'DAYS_AFTER' | 'FIXED_DATE'
  daysAfter?: number
  fixedDateDay?: number
  unit?: 'DAYS' | 'MONTHS'
}

export default function CustomerPaymentTermComponent({
  onSettingsChange,
  defaultValues,
}: CustomerPaymentTermProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [settings, setSettings] = useState<CustomerPaymentTerm>(
    defaultValues || {
      dueDateType: 'DAYS_AFTER',
      daysAfter: 14,
      unit: 'DAYS',
      fixedDateDay: 1,
    }
  )

  const handleSettingChange = (newSetting: Partial<CustomerPaymentTerm>) => {
    const updatedSettings = { ...settings, ...newSetting }
    setSettings(updatedSettings)
    onSettingsChange?.(updatedSettings)
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
      >
        <h2 className="text-lg font-semibold text-gray-900">Customer Payment Term</h2>
        {isExpanded ? (
          <ChevronUpIcon className="w-5 h-5 text-[#31BCFF]" />
        ) : (
          <ChevronDownIcon className="w-5 h-5 text-gray-600" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-6 py-6 bg-white/50 border-t border-gray-200 space-y-6">
          {/* Invoice Due Date Section */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-4">Invoice due date</h3>

            {/* Radio Options */}
            <div className="flex gap-4 mb-6">
              {/* Days/Months Option */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="dueDateType"
                  value="DAYS_AFTER"
                  checked={settings.dueDateType === 'DAYS_AFTER'}
                  onChange={() => handleSettingChange({ dueDateType: 'DAYS_AFTER' })}
                  className="w-5 h-5"
                />
                <span className="text-sm text-gray-700">
                  Number of days/months until due date
                </span>
              </label>

              {/* Fixed Date Option */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="dueDateType"
                  value="FIXED_DATE"
                  checked={settings.dueDateType === 'FIXED_DATE'}
                  onChange={() => handleSettingChange({ dueDateType: 'FIXED_DATE' })}
                  className="w-5 h-5"
                />
                <span className="text-sm text-gray-700 flex items-center gap-2">
                  Fixed due date
                  <InformationCircleIcon className="w-4 h-4 text-gray-400" />
                </span>
              </label>
            </div>

            {/* Conditional Input Section */}
            {settings.dueDateType === 'DAYS_AFTER' && (
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <span className="text-sm text-gray-700">Due date is</span>
                <input
                  type="number"
                  value={settings.daysAfter || 14}
                  onChange={(e) =>
                    handleSettingChange({ daysAfter: parseInt(e.target.value) || 0 })
                  }
                  className="w-16 px-3 py-2 rounded-lg border border-gray-300 bg-white text-center text-sm focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF]"
                />
                <select
                  value={settings.unit || 'Days'}
                  onChange={(e) =>
                    handleSettingChange({ unit: e.target.value as 'DAYS' | 'MONTHS' })
                  }
                  className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF]"
                >
                  <option>Days</option>
                  <option>Months</option>
                </select>
                <span className="text-sm text-gray-700">after the invoice date.</span>
              </div>
            )}

            {settings.dueDateType === 'FIXED_DATE' && (
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <span className="text-sm text-gray-700">The fixed due date is always day</span>
                <input
                  type="number"
                  value={settings.fixedDateDay || 1}
                  onChange={(e) =>
                    handleSettingChange({ fixedDateDay: parseInt(e.target.value) || 1 })
                  }
                  min="1"
                  max="31"
                  className="w-16 px-3 py-2 rounded-lg border border-gray-300 bg-white text-center text-sm focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF]"
                />
                <span className="text-sm text-gray-700">in a month.</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
