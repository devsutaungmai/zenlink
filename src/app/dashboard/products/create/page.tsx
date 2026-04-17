'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'
import { useProductSettings } from '@/shared/hooks/useProductSettings'
import { ProductFieldSettingsDialog } from '@/components/invoice/ProductFieldSettingsDialog'
import { useAutoFocus } from '@/shared/hooks/useAutoFocus'
import { formatProductNumberForDisplay } from '@/shared/lib/invoiceHelper'
import { productValidationSchema } from '@/components/invoice/validation'
import z from 'zod'
import { LedgerAccountOption, LedgerAccountSelectCombobox } from '@/components/invoice/LedgerAccountSelectCombobox'
import { LedgerAccountFormType } from '@/components/invoice/LedgerAccountDialog'
import { toast } from '@/shared/lib/toast'

interface Unit {
  id: string
  name: string,
  symbol?: string | null
}

interface ProductGroup {
  id: string
  name: string
}

interface VatCode {
  name: string
  rate: number
}

interface BusinessVatCode {
  vatCode: VatCode
}

interface LedgerAccount {
  id: string
  accountNumber: string
  name: string
  vatCode: {
    name: string
    rate: number
  }
  businessVatCodes: BusinessVatCode[]
}

interface ProductFormData {
  active: boolean
  productNumber: string
  defaultProductNumber?: string
  sequence?: number
  year?: number
  productName: string
  salesPrice: number
  costPrice: number
  discountPercentage: number
  unitId: string
  productGroupId: string
  ledgerAccountId: string
}

export default function CreateProductPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const searchParams = useSearchParams()
  const copyMode = searchParams.get('copy') === "true";
  const productId = searchParams.get('productId') ?? "";
  const [loading, setLoading] = useState(false)
  const [units, setUnits] = useState<Unit[]>([])
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([])
  const [salesLedgerAccounts, setSalesLedgerAccounts] = useState<LedgerAccount[]>([])
  const firstInputRef = useAutoFocus<HTMLInputElement>()
  const [fetchingLoading, setFetchingLoading] = useState(true)

  const [formData, setFormData] = useState<ProductFormData>({
    active: true,
    productNumber: '',
    defaultProductNumber: '',
    sequence: 0,
    year: 0,
    productName: '',
    salesPrice: 0,
    costPrice: 0,
    discountPercentage: 0,
    unitId: '',
    productGroupId: '',
    ledgerAccountId: ''
  })

  const { settings, refetch } = useProductSettings();
  const [visibleFields, setVisibleFields] = useState({
    showSalesPrice: false,
    showCostPrice: false,
    showDiscountPercentage: false,
    showUnit: false,
    showProductGroup: false,
  })

  useEffect(() => {
    if (settings) {
      setVisibleFields({
        showSalesPrice: settings.showSalesPrice,
        showCostPrice: settings.showCostPrice,
        showDiscountPercentage: settings.showDiscountPercentage,
        showUnit: settings.showUnit,
        showProductGroup: settings.showProductGroup,
      });
    }
  }, [settings]);

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchUnits()
    fetchProductGroups()
    fetchSalesLedgerAccounts()
    getDefaultProductNumber()
  }, [])


  useEffect(() => {
    if (copyMode && productId) {
      fetchProduct()
    }
  }, [copyMode, productId]);


  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products/${productId}`)
      if (res.ok) {
        const data = await res.json()
        const formattedData = {
          active: data.active,
          productNumber: formatProductNumberForDisplay(data.productNumber) || '',
          productName: data.productName || '',
          salesPrice: data.salesPrice || '',
          costPrice: data.costPrice || '',
          discountPercentage: data.discountPercentage || '',
          unitId: data.unitId || '',
          productGroupId: data.productGroupId || '',
          ledgerAccountId: data.ledgerAccountId || ''
        };
        setFormData(formattedData)
      }
    } catch (error) {
      console.error('Error fetching category:', error)
    } finally {
      setFetchingLoading(false)
    }
  }

  const fetchUnits = async () => {
    try {
      const res = await fetch('/api/units')
      if (res.ok) {
        const data = await res.json()
        setUnits(data)
        // if (data.length > 0) {
        //     setFormData(prev => ({ ...prev, unitId: data[0].id }))
        // }
      }
    } catch (error) {
      console.error('Error fetching units:', error)
    }
  }

  const fetchProductGroups = async () => {
    try {
      const res = await fetch('/api/product-groups')
      if (res.ok) {
        const data = await res.json()
        setProductGroups(data)
        // if (data.length > 0) {
        //     setFormData(prev => ({ ...prev, productGroupId: data[0].id }))
        // }
      }
    } catch (error) {
      console.error('Error fetching product groups:', error)
    }
  }

  const fetchSalesLedgerAccounts = async () => {
    try {
      const res = await fetch('/api/sales-ledger-accounts')
      if (res.ok) {
        const data = await res.json()
        setSalesLedgerAccounts(data)
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, ledgerAccountId: data[0].id }))
        }
      }
    } catch (error) {
      console.error('Error fetching sales ledger accounts:', error)
    }
  }

  const getDefaultProductNumber = async () => {
    try {
      const res = await fetch('/api/products/next-number')

      if (res.ok) {
        const data = await res.json()
        const defaultNumber = formatProductNumberForDisplay(data.productNumber);

        setFormData(prev => ({
          ...prev, productNumber: defaultNumber, defaultProductNumber: data.productNumber, sequence: data.sequence,
          year: data.year
        }))
      }
    } catch (error) {
      console.error('Error fetching default project number:', error)
    }
  }

  const validateField = (fieldName: string, value: any) => {
    try {
      const fieldSchema = productValidationSchema.shape[fieldName as keyof typeof productValidationSchema.shape]
      if (fieldSchema) {
        fieldSchema.parse(value)
        setValidationErrors(prev => ({ ...prev, [fieldName]: '' }))
      }
    } catch (error) {
      if (error instanceof z.ZodError && error.issues.length > 0) {
        setValidationErrors(prev => ({ ...prev, [fieldName]: error.issues[0].message }))
      }
    }
  }

  const debouncedValidation = (fieldName: string, value: any) => {
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current)
    }

    validationTimeoutRef.current = setTimeout(() => {
      validateField(fieldName, value)
    }, 500)
  }

    const onSaveLedgerAccount = async (
    account: LedgerAccountFormType
  ): Promise<LedgerAccountOption> => {
    const res = await fetch('/api/ledger/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account),
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || 'Failed to create ledger account')
    }
    const created: LedgerAccount = await res.json()
    setSalesLedgerAccounts(prev => [...prev, created])
    await toast('success', 'Ledger account created successfully')
    return created
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create product')
      }

      Swal.fire({
        text: 'Product created successfully',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'success',
        customClass: {
          popup: 'swal-toast-wide'
        }
      })

      router.push('/dashboard/products')
      router.refresh()
    } catch (error) {

      await Swal.fire({
        title: 'Error',
        text: error instanceof Error ? error.message : 'An error occurred',

        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'error',
        confirmButtonColor: '#31BCFF',
        customClass: {
          popup: 'swal-toast-wide'
        }
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/dashboard/products"
                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
              </Link>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Create Product
              </h1>
            </div>
            <p className="mt-2 text-gray-600 ml-14">
              Add a new category to organize your department functions
            </p>
          </div>

          <div className="hidden md:flex items-center space-x-2">
            <ProductFieldSettingsDialog
              initialSettings={visibleFields}
              onSettingsSaved={(newSettings) => {
                setVisibleFields(newSettings);
                console.log('Settings saved')
              }}
              onRefresh={() => {
                refetch()
              }}
            />
            <div className="w-12 h-12 bg-[#31BCFF]/10 rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-[#31BCFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Form Container */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-end items-center gap-3 mt-8">
            <input
              id="active"
              type="checkbox"
              checked={formData.active}
              onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              className="h-5 w-5 text-[#31BCFF] border-gray-300 rounded focus:ring-[#31BCFF]/50"
            />
            <label htmlFor="active" className="text-sm font-medium text-gray-700">
              Active
            </label>
          </div>

          <div>
            {/* Product Name & Product Number */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="productName" className="block text-sm font-medium text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  ref={firstInputRef}
                  type="text"
                  id="productName"
                  required
                  value={formData.productName}
                  onChange={(e) => { setFormData({ ...formData, productName: e.target.value }); debouncedValidation('productName', e.target.value) }}
                  onBlur={(e) => validateField('productName', e.target.value)}
                  className={`block w-full px-4 py-3 rounded-xl border ${validationErrors.productName ? 'border-red-500' : 'border-gray-300'} bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200`}
                  placeholder="Enter product name"
                />
                {validationErrors.productName && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.productName}</p>
                )}
              </div>

              <div>
                <label htmlFor="productNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Product Number *
                </label>
                <input
                  type="text"
                  id="productNumber"
                  required
                  value={formData.productNumber}
                  onChange={(e) => { setFormData({ ...formData, productNumber: e.target.value }); debouncedValidation('productNumber', e.target.value) }}
                  onBlur={(e) => validateField('productNumber', e.target.value)}
                  className={`block w-full px-4 py-3 rounded-xl border ${validationErrors.productNumber ? 'border-red-500' : 'border-gray-300'} bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200`}
                  placeholder="Enter product number"
                />
                {validationErrors.productNumber && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.productNumber}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-6 mt-6">
              {visibleFields.showSalesPrice && (
                <div className="grow basis-[calc(20%-12px)] min-w-[150px]">
                  <label htmlFor="salesPrice" className="block text-sm font-medium text-gray-700 mb-2">
                    Sales Price
                  </label>
                  <input
                    type="number"
                    id="salesPrice"
                    value={formData.salesPrice || ""}
                    onChange={(e) => setFormData({ ...formData, salesPrice: Number.parseFloat(e.target.value) })}
                    className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                    placeholder="Enter sales price"
                  />
                </div>
              )}

              {visibleFields.showCostPrice && (
                <div className="grow basis-[calc(20%-12px)] min-w-[150px]">
                  <label htmlFor="costPrice" className="block text-sm font-medium text-gray-700 mb-2">
                    Cost Price
                  </label>
                  <input
                    type="number"
                    id="costPrice"
                    value={formData.costPrice || ""}
                    onChange={(e) => setFormData({ ...formData, costPrice: Number.parseFloat(e.target.value) })}
                    className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                    placeholder="Enter cost price"
                  />
                </div>
              )}

              {visibleFields.showDiscountPercentage && (
                <div className="grow basis-[calc(20%-12px)] min-w-[150px]">
                  <label htmlFor="discountPercentage" className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Percentage
                  </label>
                  <input
                    type="number"
                    id="discountPercentage"
                    value={formData.discountPercentage ?? ""}
                    onChange={(e) =>
                      setFormData({ ...formData, discountPercentage: e.target.value ? Number.parseFloat(e.target.value) : 0 })
                    }
                    className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                    placeholder="Enter discount %"
                  />
                </div>
              )}

              {visibleFields.showUnit && (
                <div className="grow basis-[calc(20%-12px)] min-w-[150px]">
                  <label htmlFor="unitId" className="block text-sm font-medium text-gray-700 mb-2">
                    Unit
                  </label>
                  <select
                    id="unitId"
                    value={formData.unitId || ""}
                    onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                    className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                  >
                    <option value="">-- Select unit --</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name} {unit.symbol ? `(${unit.symbol})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {visibleFields.showProductGroup && (
                <div className="grow basis-[calc(20%-12px)] min-w-[150px]">
                  <label htmlFor="productGroupId" className="block text-sm font-medium text-gray-700 mb-2">
                    Product Group
                  </label>
                  <select
                    id="productGroupId"
                    value={formData.productGroupId || ""}
                    onChange={(e) => setFormData({ ...formData, productGroupId: e.target.value })}
                    className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                  >
                    <option value="">--Select Product Group--</option>
                    {productGroups.map((pg) => (
                      <option key={pg.id} value={pg.id}>
                        {pg.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Ledger Account - always visible */}
            {/* <div className='mt-4'>
              <label htmlFor="ledgerAccountId" className="block text-sm font-medium text-gray-700 mb-2">
                Ledger Account
              </label>
              <select
                id="ledgerAccountId"
                required
                value={formData.ledgerAccountId || ""}
                onChange={(e) => setFormData({ ...formData, ledgerAccountId: e.target.value })}
                className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
              >
                <option value="">--Select Ledger Account--</option>
                {salesLedgerAccounts.map((sa) => {
                  const businessVat = sa.businessVatCodes?.[0]?.vatCode

                  return (
                    <option key={sa.id} value={sa.id}>
                      {sa.accountNumber} - {sa.name} -{" "}
                      {businessVat
                        ? `${businessVat.name} (${businessVat.rate}%)`
                        : sa.vatCode
                          ? `${sa.vatCode.name} (${sa.vatCode.rate}%)`
                          : "0%"}
                    </option>
                  )
                })}

              </select>
            </div> */}
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ledger Account *
              </label>
              <LedgerAccountSelectCombobox
                ledgerAccounts={salesLedgerAccounts}
                value={formData.ledgerAccountId}
                onChange={(id) => setFormData(prev => ({ ...prev, ledgerAccountId: id }))}
                onLedgerAccountCreated={(newAccount) => {
                  // state already updated inside onSaveLedgerAccount
                }}
                onSaveNewLedgerAccount={onSaveLedgerAccount}
                placeholder="Select Ledger Account"
              />
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
              <Link
                href="/dashboard/products"
                className="px-6 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? 'Creating...' : 'Create Product'}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  )
}
