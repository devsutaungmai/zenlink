'use client'

import { useState, useEffect } from 'react'
import {
  BuildingOfficeIcon,
  CurrencyDollarIcon,
  MapPinIcon,
  TagIcon,
  CheckIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  IdentificationIcon,
  PhotoIcon,
  XMarkIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'
import { CURRENCY_INFO } from '@/shared/lib/currency'
import { useTranslation } from 'react-i18next'

interface Business {
  id: string
  name: string
  address: string
  type: string
  currency: string
  employeesCount: number
  organizationNumber: string | null
  phone: string | null
  email: string | null
  website: string | null
  logoUrl: string | null
}

const INDUSTRY_GROUPS = [
  { group: 'Hospitality', options: ['Hotels', 'Café & Restaurant', 'Bar, Pub & Nightclub', 'Catering & Canteen'] },
  { group: 'Retail', options: ['Retail Store', 'Bakery', 'Commerce', 'Barber Shops & Beauty Salons'] },
  { group: 'Professional Services', options: ['Real Estate', 'Cleaning Services', 'Security', 'Staffing and Recruiting', 'Call Center & Telemarketing', 'Facilities Management & Commercial Cleaning'] },
  { group: 'Entertainment & Leisure', options: ['Entertainment, Cinemas & Fun Parks', 'Events & Event Management', 'Museums and Institutions', 'Performing Arts'] },
  { group: 'Healthcare & Medical', options: ['Elderly Care Services', 'Dental Offices', 'Hospital and Healthcare', 'Drug Stores & Pharmacies'] },
  { group: 'Education', options: ['Colleges & Universities', 'Primary or Secondary Education', 'Childcare'] },
  { group: 'Finance', options: ['Accounting', 'Insurance', 'Banking'] },
  { group: 'Media & Communications', options: ['Advertising and marketing'] },
  { group: 'Transportation', options: ['Logistics & Supply Chain', 'Warehousing', 'Transportation'] },
  { group: 'Other', options: ['Manufacturing', 'Construction', 'Municipality', 'Non-profit', 'Non-Profit & Charitable Organisations'] },
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
    currency: 'USD',
    organizationNumber: '',
    phone: '',
    email: '',
    website: '',
  })
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const { t } = useTranslation('settings')

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
          currency: data.currency || 'USD',
          organizationNumber: data.organizationNumber || '',
          phone: data.phone || '',
          email: data.email || '',
          website: data.website || '',
        })
        if (data.logoUrl) {
          setLogoPreview(data.logoUrl)
        }
      } else {
        setError('Failed to load business information')
      }
    } catch (err) {
      console.error('Error fetching business:', err)
      setError('Failed to load business information')
    } finally {
      setLoading(false)
    }
  }

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only JPEG, PNG, WebP, and SVG images are allowed.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB.')
      return
    }

    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = () => setLogoPreview(reader.result as string)
    reader.readAsDataURL(file)
    if (error) setError(null)
  }

  const removeLogo = () => {
    setLogoFile(null)
    setLogoPreview(null)
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
      const submitData = new FormData()
      submitData.append('name', formData.name.trim())
      submitData.append('address', formData.address.trim())
      submitData.append('type', formData.type.trim())
      submitData.append('currency', formData.currency)
      submitData.append('organizationNumber', formData.organizationNumber.trim())
      submitData.append('phone', formData.phone.trim())
      submitData.append('email', formData.email.trim())
      submitData.append('website', formData.website.trim())

      if (logoFile) {
        submitData.append('logo', logoFile)
      } else if (logoPreview && business?.logoUrl) {
        submitData.append('existingLogoUrl', business.logoUrl)
      }

      const res = await fetch('/api/business', {
        method: 'PUT',
        body: submitData,
      })

      if (res.ok) {
        const updatedBusiness = await res.json()
        setBusiness(updatedBusiness)
        setLogoFile(null)
        if (updatedBusiness.logoUrl) {
          setLogoPreview(updatedBusiness.logoUrl)
        }
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        const errorData = await res.json()
        setError(errorData.error || 'Failed to update business information')
      }
    } catch (err) {
      console.error('Error updating business:', err)
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
            {INDUSTRY_GROUPS.map((group) => (
              <optgroup key={group.group} label={group.group}>
                {group.options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </optgroup>
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

        {/* Organization Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <IdentificationIcon className="w-4 h-4 inline mr-2" />
            Organization Number
          </label>
          <input
            type="text"
            value={formData.organizationNumber}
            onChange={(e) => handleInputChange('organizationNumber', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Enter organization number"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <PhoneIcon className="w-4 h-4 inline mr-2" />
            Phone
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Enter phone number"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <EnvelopeIcon className="w-4 h-4 inline mr-2" />
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="Enter business email"
          />
        </div>

        {/* Website */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <GlobeAltIcon className="w-4 h-4 inline mr-2" />
            Website
          </label>
          <input
            type="url"
            value={formData.website}
            onChange={(e) => handleInputChange('website', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="https://example.com"
          />
        </div>

        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <PhotoIcon className="w-4 h-4 inline mr-2" />
            Business Logo
            <span className="text-gray-500 font-normal ml-1">(optional)</span>
          </label>

          {!logoPreview ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
              <PhotoIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">Upload your business logo</p>
              <p className="text-xs text-gray-500 mb-4">PNG, JPG, WebP or SVG · max 5MB</p>
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors">
                <PlusIcon className="w-4 h-4" />
                Choose file
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div className="border border-gray-300 rounded-lg p-4">
              <div className="flex items-start gap-4">
                <img
                  src={logoPreview}
                  alt="Business logo"
                  className="w-20 h-20 object-contain border border-gray-200 rounded"
                />
                <div className="flex-1">
                  {logoFile ? (
                    <>
                      <p className="text-sm font-medium text-gray-900">{logoFile.name}</p>
                      <p className="text-xs text-gray-500">{(logoFile.size / 1024 / 1024).toFixed(2)} MB</p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">Current logo</p>
                  )}
                  <div className="mt-2 flex items-center gap-3">
                    <label className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 cursor-pointer">
                      <PlusIcon className="w-3 h-3" />
                      Replace
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                    >
                      <XMarkIcon className="w-3 h-3" />
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
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
