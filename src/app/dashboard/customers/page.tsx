'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import Swal from 'sweetalert2'

interface Customer {
  id: string
  active: boolean
  customerNumber: string
  customerName: string
  organizationNumber?: string | null
  address?: string | null
  postalCode?: string | null
  postalAddress?: string | null
  phoneNumber?: string | null
  email?: string | null
  discountPercentage?: number | null
  deliveryAddress?: string | null
  deliveryAddressPostalCode?: string | null
  deliveryAddressPostalAddress?: string | null
}


export default function CategoriesPage() {
  const { t } = useTranslation()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers')
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }
      
      const data = await res.json()
      
      if (Array.isArray(data)) {
        setCustomers(data)
      } else {
        console.error('API did not return an array:', data)
        setCustomers([])
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, customerName: string) => {
    try {
      const result = await Swal.fire({
        title: t('common.confirm'),
        text: `Are you sure you want to delete "${customerName}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#31BCFF',
        cancelButtonColor: '#d33',
        confirmButtonText: t('common.yes'),
        cancelButtonText: t('common.cancel')
      })

      if (result.isConfirmed) {
        const res = await fetch(`/api/customers/${id}`, {
          method: 'DELETE',
        })
        
        if (res.ok) {
          setCustomers(customers.filter(cust => cust.id !== id))
          
          await Swal.fire({
            title: t('common.success'),
            text: 'Customer deleted successfully',
            icon: 'success',
            confirmButtonColor: '#31BCFF',
          })
        } else {
          throw new Error('Failed to delete customer')
        }
      }
    } catch (error) {
      console.error('Error deleting customer:', error)
      await Swal.fire({
        title: t('common.error'),
        text: 'Failed to delete customer',
        icon: 'error',
        confirmButtonColor: '#31BCFF',
      })
    }
  }

  const filteredCustomers = customers.filter(customer =>
    customer.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.customerNumber.toLowerCase().includes(searchTerm.toLowerCase()) 
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#31BCFF]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Customers
            </h1>
            <p className="mt-2 text-gray-600">
              Manage customer for invoice
            </p>
            <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
              <span className="flex items-center">
                <div className="w-2 h-2 bg-[#31BCFF] rounded-full mr-2"></div>
                {customers.length} {customers.length === 1 ? 'customer' : 'customers'}
              </span>
            </div>
          </div>
          <Link
            href="/dashboard/customers/create"
            className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 group"
          >
            <PlusIcon className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
            Create Customer
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-lg">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search customers..."
              className="block w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
            />
          </div>
          <div className="flex items-center text-sm text-gray-500">
            Showing {filteredCustomers.length} of {customers.length}
          </div>
        </div>
      </div>

      {/* Customers Grid */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-12 border border-gray-200/50 shadow-lg text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first customer'}
          </p>
          {!searchTerm && (
            <Link
              href="/dashboard/customers/create"
              className="inline-flex items-center px-6 py-3 rounded-xl bg-[#31BCFF] text-white font-medium hover:bg-[#31BCFF]/90 transition-colors duration-200"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Create First Customer
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => (
            <div
              key={customer.id}
              className="group bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] hover:border-[#31BCFF]/30"
            >
              {/* Category Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#31BCFF] transition-colors duration-200">
                      {customer.customerName}
                    </h3>
                  </div>
                  {customer.customerNumber && (
                    <p className="text-sm text-gray-500 mt-1">
                      {customer.customerNumber}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {customer.email}
                  </p>
                </div>
                <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Link
                    href={`/dashboard/customers/${customer.id}/edit`}
                    className="p-2 text-gray-400 hover:text-[#31BCFF] hover:bg-blue-50 rounded-lg transition-all duration-200"
                    title="Edit Category"
                  >
                    <PencilIcon className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(customer.id, customer.customerName)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                    title="Delete Category"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Quick Actions */}
              {/* <div className="mt-4 pt-4 border-t border-gray-200/50">
                <Link
                  href={`/dashboard/customers/${customer.id}/edit`}
                  className="w-full inline-flex items-center justify-center px-4 py-2 rounded-xl bg-gray-50 text-gray-700 font-medium hover:bg-[#31BCFF] hover:text-white transition-all duration-200 group/btn"
                >
                  <PencilIcon className="w-4 h-4 mr-2 group-hover/btn:scale-110 transition-transform duration-200" />
                  Edit Category
                </Link>
              </div> */}
          </div>
          ))}
        </div>
      )}
    </div>
  )
}
