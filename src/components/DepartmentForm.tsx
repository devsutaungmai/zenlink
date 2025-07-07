import React, { useState, useRef, useEffect } from 'react'
import { ChevronDownIcon, MagnifyingGlassIcon, CheckIcon } from '@heroicons/react/24/outline'
import { countries } from '@/app/constants/countries'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'

interface DepartmentFormData {
  name: string
  number?: string
  address: string
  address2?: string
  postCode?: string
  city: string
  phone: string
  country: string
}

interface DepartmentFormProps {
  initialData?: DepartmentFormData
  onSubmit: (data: DepartmentFormData) => void
  loading: boolean
}

export default function DepartmentForm({ initialData, onSubmit, loading }: DepartmentFormProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [formData, setFormData] = React.useState<DepartmentFormData>(
    initialData || {
      name: '',
      number: '',
      address: '',
      address2: '',
      postCode: '',
      city: '',
      phone: '',
      country: '',
    }
  )
  
  // Country select state
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  
  // Filter countries based on search
  const filteredCountries = countries.filter(country =>
    country.name.toLowerCase().includes(countrySearch.toLowerCase())
  )
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false)
        setCountrySearch('')
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])
  
  const handleCountrySelect = (countryName: string) => {
    setFormData({ ...formData, country: countryName })
    setIsCountryDropdownOpen(false)
    setCountrySearch('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('departments.name')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#31BCFF] focus:outline-none focus:ring-1 focus:ring-[#31BCFF]"
            placeholder={t('departments.enter_department_name')}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('departments.number')}
          </label>
          <input
            type="text"
            value={formData.number}
            onChange={(e) => setFormData({ ...formData, number: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#31BCFF] focus:outline-none focus:ring-1 focus:ring-[#31BCFF]"
            placeholder={t('departments.department_number')}
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('departments.address')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#31BCFF] focus:outline-none focus:ring-1 focus:ring-[#31BCFF]"
            placeholder={t('departments.street_address')}
            required
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('departments.address_line_2')}
          </label>
          <input
            type="text"
            value={formData.address2}
            onChange={(e) => setFormData({ ...formData, address2: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#31BCFF] focus:outline-none focus:ring-1 focus:ring-[#31BCFF]"
            placeholder={t('departments.apartment_suite')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('departments.post_code')}
          </label>
          <input
            type="text"
            value={formData.postCode}
            onChange={(e) => setFormData({ ...formData, postCode: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#31BCFF] focus:outline-none focus:ring-1 focus:ring-[#31BCFF]"
            placeholder={t('departments.postal_code')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('departments.city')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#31BCFF] focus:outline-none focus:ring-1 focus:ring-[#31BCFF]"
            placeholder={t('departments.city_name')}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            {t('departments.phone')} <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#31BCFF] focus:outline-none focus:ring-1 focus:ring-[#31BCFF]"
            placeholder={t('departments.phone_number')}
            required
          />
        </div>

        <div className="relative" ref={dropdownRef}>
          <label className="block text-sm font-medium text-gray-700">
            {t('departments.country')} <span className="text-red-500">*</span>
          </label>
          
          {/* Custom Select2-style dropdown */}
          <div
            onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-[#31BCFF] focus:outline-none focus:ring-1 focus:ring-[#31BCFF] cursor-pointer bg-white flex items-center justify-between"
          >
            <span className={formData.country ? 'text-gray-900' : 'text-gray-500'}>
              {formData.country || t('departments.select_country')}
            </span>
            <ChevronDownIcon 
              className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                isCountryDropdownOpen ? 'rotate-180' : ''
              }`} 
            />
          </div>
          
          {/* Dropdown */}
          {isCountryDropdownOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-300 max-h-80 overflow-hidden">
              {/* Search input */}
              <div className="p-3 border-b border-gray-200">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    placeholder={t('departments.search_countries')}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-[#31BCFF] focus:border-[#31BCFF]"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
              
              {/* Options */}
              <div className="max-h-64 overflow-y-auto">
                {filteredCountries.length > 0 ? (
                  filteredCountries.map((country) => (
                    <div
                      key={country.code}
                      onClick={() => handleCountrySelect(country.name)}
                      className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 cursor-pointer"
                    >
                      <span className="text-gray-900">{country.name}</span>
                      {formData.country === country.name && (
                        <CheckIcon className="w-4 h-4 text-[#31BCFF]" />
                      )}
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-6 text-center text-gray-500 text-sm">
                    {t('departments.no_countries_found')}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-4 pt-6">
        <button
          type="button"
          onClick={() => router.push('/dashboard/departments')} 
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#31BCFF]"
        >
          {t('departments.cancel')}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-[#31BCFF] border border-transparent rounded-md hover:bg-[#31BCFF]/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#31BCFF] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>{t('departments.saving')}</span>
            </div>
          ) : (
            t('departments.save_department')
          )}
        </button>
      </div>
    </form>
  )
}
