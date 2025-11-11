'use client'

import { useState, useEffect } from 'react'
import { 
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  TagIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { CURRENCY_INFO, getCurrencySymbol } from '@/shared/lib/currency'
import { useTranslation } from 'react-i18next'

interface Business {
  id: string
  name: string
  address: string
  type: string
  currency: string
  employeesCount: number
}

const BUSINESS_TYPES = [
  'Restaurant',
  'Retail',
  'Healthcare',
  'Technology',
  'Manufacturing',
  'Construction',
  'Education',
  'Professional Services',
  'Hospitality',
  'Transportation',
  'Finance',
  'Non-profit',
  'Other'
]

export default function BusinessInfoSettings() {
  const [business, setBusiness] = useState<Business | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    type: '',
    currency: 'USD'
  })
  const {t} = useTranslation('settings');

  useEffect(() => {
    fetchBusiness()
  }, [])

  const fetchBusiness = async () => {
    try {
      const res = await fetch('/api/business')
      if (res.ok) {
        const data = await res.json()
        setBusiness(data)
        setFormData({
          name: data.name || '',
          address: data.address || '',
          type: data.type || '',
          currency: data.currency || 'USD'
        })
      } else {
        setError('Failed to load business information')
      }
    } catch (error) {
      console.error('Error fetching business:', error)
      setError('Failed to load business information')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setError('Business name is required')
      return
    }

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch('/api/business', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        const updatedBusiness = await res.json()
        setBusiness(updatedBusiness)
        setSuccess(true)
        
        // Hide success message after 3 seconds
        setTimeout(() => setSuccess(false), 3000)
      } else {
        const errorData = await res.json()
        setError(errorData.error || 'Failed to update business information')
      }
    } catch (error) {
      console.error('Error updating business:', error)
      setError('Failed to update business information')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (error) setError(null)
  }

  const selectedCurrency = CURRENCY_INFO.find(c => c.code === formData.currency)

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-4 w-1/3"></div>
          <div className="space-y-4">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <BuildingOfficeIcon className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{t('business_setting.page.title')}</h2>
            <p className="text-gray-600 text-sm">{t('business_setting.page.description')}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <CheckIcon className="w-4 h-4" />
            {t('business_setting.messages.success')}
          </div>
        )}

        {/* Business Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <BuildingOfficeIcon className="w-4 h-4 inline mr-2" />
            {t('business_setting.form.business_name')}
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Enter your business name"
            required
          />
        </div>

        {/* Business Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MapPinIcon className="w-4 h-4 inline mr-2" />
            {t('business_setting.form.business_address')}
          </label>
          <textarea
            value={formData.address}
            onChange={(e) => handleInputChange('address', e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
            placeholder="Enter your business address"
          />
        </div>

        {/* Business Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <TagIcon className="w-4 h-4 inline mr-2" />
            {t('business_setting.form.business_type')}
          </label>
          <select
            value={formData.type}
            onChange={(e) => handleInputChange('type', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
                      <option value="">{t('business_setting.form.business_type_placeholder')}</option>
            {BUSINESS_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Currency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <CurrencyDollarIcon className="w-4 h-4 inline mr-2" />
            {t('business_setting.form.default_currency')}
          </label>
          <select
            value={formData.currency}
            onChange={(e) => handleInputChange('currency', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            {CURRENCY_INFO.map((currency) => (
              <option key={currency.code} value={currency.code}>
                {currency.symbol} {currency.code} - {currency.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {t('business_setting.form.currency_hint')}
          </p>
        </div>

        {/* Business Stats */}
        {business && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
            {t('business_setting.statistics.title')}
          </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">{t('business_setting.statistics.total_employees')}:</span>
                <span className="font-medium text-gray-900 ml-2">{business.employeesCount}</span>
              </div>
              <div>
                <span className="text-gray-500">{t('business_setting.statistics.current_currency')}:</span>
                <span className="font-medium text-gray-900 ml-2">
                  {selectedCurrency?.symbol} {selectedCurrency?.code}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? t('business_setting.messages.saving') : t('business_setting.buttons.save_changes')}
          </button>
        </div>
      </form>
    </div>
  )
}
