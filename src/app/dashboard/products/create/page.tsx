'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useProductSettings } from '@/shared/hooks/useProductSettings'
import Cog6ToothIcon from '@heroicons/react/24/solid/Cog6ToothIcon'

interface Unit {
  id: string
  name: string,
  symbol?: string | null
}

interface ProductGroup {
  id: string
  name: string
}

interface SalesAccount {
  id: string
  accountNumber: string
  accountName: string
}

export default function CreateProductPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [units, setUnits] = useState<Unit[]>([])
  const [productGroups, setProductGroups] = useState<ProductGroup[]>([])
  const [salesAccounts, setSalesAccounts] = useState<SalesAccount[]>([])

  const [formData, setFormData] = useState({
    active: true,
    productNumber: '',
    productName: '',
    salesPrice: 0,
    costPrice: 0,
    discountPercentage: 0,
    unitId: '',
    productGroupId: '',
    salesAccountId: ''
  })

  const { settings } = useProductSettings();
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [visibleFields, setVisibleFields] = useState({
    showSalesPrice: true,
    showCostPrice: true,
    showDiscountPercentage: true,
    showUnit: true,
    showProductGroup: true,
  })


  useEffect(() => {
    if (settings) {
      setVisibleFields({
        showSalesPrice: settings.showSalesPrice,
        showCostPrice: settings.showCostPrice,
        showDiscountPercentage: settings.showDiscountPercentage,
        showUnit: settings.showUnit,
        showProductGroup: settings.showProductGroup,
      })
    }
  }, [settings])
  const handleSaveSettings = async () => {

    setSettingsOpen(false)
    setLoading(true)
    try {
      const res = await fetch('/api/products/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(visibleFields),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save the settings')
      }
      Swal.fire({
        title: t('common.success'),
        text: 'Settings saved successfully',
        icon: 'success',
        confirmButtonColor: '#31BCFF',
      })


    } catch (error) {
      await Swal.fire({
        title: 'Error',
        text: error instanceof Error ? error.message : 'An error occurred',
        icon: 'error',
        confirmButtonColor: '#31BCFF',
      })
    } finally {
      setLoading(false)
    }

  }


  useEffect(() => {
    fetchUnits()
    fetchProductGroups()
    fetchSalesAccounts()
  }, [])

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

  const fetchSalesAccounts = async () => {
    try {
      const res = await fetch('/api/sales-accounts')
      if (res.ok) {
        const data = await res.json()
        setSalesAccounts(data)
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, salesAccountId: data[0].id }))
        }
      }
    } catch (error) {
      console.error('Error fetching sales accounts:', error)
    }
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

      await Swal.fire({
        title: 'Success!',
        text: 'Product created successfully',
        icon: 'success',
        confirmButtonColor: '#31BCFF',
      })

      router.push('/dashboard/products')
      router.refresh()
    } catch (error) {
      await Swal.fire({
        title: 'Error',
        text: error instanceof Error ? error.message : 'An error occurred',
        icon: 'error',
        confirmButtonColor: '#31BCFF',
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
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <button className="inline-flex items-center justify-center px-4 py-3 rounded-2xl bg-white text-gray-700 font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 border border-gray-200">
                  <Cog6ToothIcon className="w-5 h-5 mr-2" />
                  Options
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">Invoice Field Options</DialogTitle>
                  <DialogDescription>
                    Select which fields you want to display in the invoice form
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">

                  <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      id="showSalesPrice"
                      checked={visibleFields.showSalesPrice}
                      onChange={(e) =>
                        setVisibleFields({ ...visibleFields, showSalesPrice: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="showSalesPrice" className="text-base font-medium cursor-pointer flex-1">
                      Sales Price
                    </label>
                  </div>

                  <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      id="showCostPrice"
                      checked={visibleFields.showCostPrice}
                      onChange={(e) =>
                        setVisibleFields({ ...visibleFields, showCostPrice: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="showCostPrice" className="text-base font-medium cursor-pointer flex-1">
                      Cost Price
                    </label>
                  </div>

                  <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      id="showDiscountPercentage"
                      checked={visibleFields.showDiscountPercentage}
                      onChange={(e) =>
                        setVisibleFields({ ...visibleFields, showDiscountPercentage: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="showDiscountPercentage" className="text-base font-medium cursor-pointer flex-1">
                      Discount Percentage
                    </label>
                  </div>

                  <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      id="showUnit"
                      checked={visibleFields.showUnit}
                      onChange={(e) =>
                        setVisibleFields({ ...visibleFields, showUnit: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="showUnit" className="text-base font-medium cursor-pointer flex-1">
                      Unit
                    </label>
                  </div>

                  <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      id="showProductGroup"
                      checked={visibleFields.showProductGroup}
                      onChange={(e) =>
                        setVisibleFields({ ...visibleFields, showProductGroup: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="showProductGroup" className="text-base font-medium cursor-pointer flex-1">
                      Product Group
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setSettingsOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveSettings} className="bg-[#31BCFF] hover:bg-[#0EA5E9] text-white">
                    Save Settings
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
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
                  type="text"
                  id="productName"
                  required
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                  placeholder="Enter product name"
                />
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
                  onChange={(e) => setFormData({ ...formData, productNumber: e.target.value })}
                  className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                  placeholder="Enter product number"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-6 mt-6">
              {visibleFields.showSalesPrice && (
                <div className="grow basis-[calc(50%-12px)] min-w-[250px]">
                  <label htmlFor="salesPrice" className="block text-sm font-medium text-gray-700 mb-2">
                    Sales Price *
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
                <div className="grow basis-[calc(50%-12px)] min-w-[250px]">
                  <label htmlFor="costPrice" className="block text-sm font-medium text-gray-700 mb-2">
                    Cost Price *
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
                <div className="grow basis-[calc(50%-12px)] min-w-[250px]">
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
                <div className="grow basis-[calc(50%-12px)] min-w-[250px]">
                  <label htmlFor="unitId" className="block text-sm font-medium text-gray-700 mb-2">
                    Unit *
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
                <div className="grow basis-[calc(50%-12px)] min-w-[250px]">
                  <label htmlFor="productGroupId" className="block text-sm font-medium text-gray-700 mb-2">
                    Product Group *
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

            {/* Sales Account - always visible */}
            <div className='mt-4'>
              <label htmlFor="salesAccountId" className="block text-sm font-medium text-gray-700 mb-2">
                Sales Account *
              </label>
              <select
                id="salesAccountId"
                required
                value={formData.salesAccountId || ""}
                onChange={(e) => setFormData({ ...formData, salesAccountId: e.target.value })}
                className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
              >
                <option value="">--Select Sales Account--</option>
                {salesAccounts.map((sa) => (
                  <option key={sa.id} value={sa.id}>
                    {sa.accountNumber} - {sa.accountName}
                  </option>
                ))}
              </select>
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
