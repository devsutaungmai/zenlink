"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline"
import { useTranslation } from "react-i18next"
import Swal from "sweetalert2"
import { formatCustomerNumberForDisplay } from "@/shared/lib/invoiceHelper"
import { useColumnVisibility } from "@/hooks/use-column-visibility"
import { ColumnVisibilityToggle } from "@/components/invoice/column-visibility-toggle"

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

export default function CustomersPage() {
  const { t } = useTranslation()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Customer columns + usage
  const COLUMNS = [
    { key: "customerNumber", label: "Customer Number" },
    { key: "customerName", label: "Customer Name" },
    { key: "email", label: "Email" },
    { key: "phoneNumber", label: "Phone" },
    { key: "address", label: "Address" },
    { key: "active", label: "Status" },
  ]

  const { columns, toggleColumn, resetColumns, isColumnVisible } = useColumnVisibility({
    storageKey: "customers-columns",
    initialColumns: COLUMNS,
    defaultVisibility: {
      customerNumber: true,
      customerName: true,
      email: true,
      phoneNumber: true,
      address: true,
      active: true,
    },
  })

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const fetchCustomers = async () => {
    try {
      const res = await fetch("/api/customers")

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }

      const data = await res.json()

      if (Array.isArray(data)) {
        setCustomers(data)
      } else {
        console.error("API did not return an array:", data)
        setCustomers([])
      }
    } catch (error) {
      console.error("Error fetching customers:", error)
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string, customerName: string) => {
    try {
      const result = await Swal.fire({
        title: t("common.confirm"),
        text: `Are you sure you want to delete "${customerName}"?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#31BCFF",
        cancelButtonColor: "#d33",
        confirmButtonText: t("common.yes"),
        cancelButtonText: t("common.cancel"),
      })

      if (result.isConfirmed) {
        const res = await fetch(`/api/customers/${id}`, {
          method: "DELETE",
        })

        if (res.ok) {
          setCustomers(customers.filter((cust) => cust.id !== id))

          await Swal.fire({
            title: t("common.success"),
            text: "Customer deleted successfully",
            icon: "success",
            confirmButtonColor: "#31BCFF",
          })
        } else {
          throw new Error("Failed to delete customer")
        }
      }
    } catch (error) {
      console.error("Error deleting customer:", error)
      await Swal.fire({
        title: t("common.error"),
        text: "Failed to delete customer",
        icon: "error",
        confirmButtonColor: "#31BCFF",
      })
    }
  }

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.customerNumber.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

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
            <p className="mt-2 text-gray-600">Manage customer for invoice</p>
            <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
              <span className="flex items-center">
                <div className="w-2 h-2 bg-[#31BCFF] rounded-full mr-2"></div>
                {customers.length} {customers.length === 1 ? "customer" : "customers"}
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
            Showing {paginatedCustomers.length} of {filteredCustomers.length}
          </div>
        </div>
      </div>

      {/* Empty State */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-12 border border-gray-200/50 shadow-lg text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No customers found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm ? "Try adjusting your search terms" : "Get started by creating your first customer"}
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
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    {isColumnVisible("customerNumber") && (
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                        Customer No.
                      </th>
                    )}

                    {isColumnVisible("customerName") && (
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                        Customer Name
                      </th>
                    )}

                    {isColumnVisible("email") && (
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                        Email
                      </th>
                    )}

                    {isColumnVisible("phoneNumber") && (
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                        Phone
                      </th>
                    )}

                    {isColumnVisible("address") && (
                      <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">
                        Address
                      </th>
                    )}

                    {isColumnVisible("active") && (
                      <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase">
                        Status
                      </th>
                    )}

                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">
                      <div className="flex items-center justify-end gap-2">
                        <span>Actions</span>
                        <ColumnVisibilityToggle
                          columns={columns}
                          onColumnToggle={toggleColumn}
                          onResetColumns={resetColumns}
                        />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {paginatedCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-blue-50/50 transition-colors duration-150">
                      {isColumnVisible("customerNumber") && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#31BCFF]/10 text-[#31BCFF]">
                            {formatCustomerNumberForDisplay(customer.customerNumber)}
                          </span>
                        </td>
                      )}
                      {isColumnVisible("customerName") && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-medium text-gray-900">{customer.customerName}</span>
                        </td>
                      )}

                      {isColumnVisible("email") && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">{customer.email || "-"}</span>
                        </td>
                      )}
                      {isColumnVisible("phoneNumber") && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">{customer.phoneNumber || "-"}</span>
                        </td>
                      )}
                      {isColumnVisible("address") && (
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600 truncate max-w-[200px] block">
                            {customer.address || "-"}
                          </span>
                        </td>
                      )}
                      {isColumnVisible("active") && <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${customer.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                            }`}
                        >
                          {customer.active ? "Active" : "Inactive"}
                        </span>
                      </td>}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/customers/${customer.id}/edit`}
                            className="p-2 text-gray-400 hover:text-[#31BCFF] hover:bg-blue-50 rounded-lg transition-all duration-200"
                            title="Edit Customer"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => handleDelete(customer.id, customer.customerName)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                            title="Delete Customer"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Desktop Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50/50">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredCustomers.length)} of{" "}
                    {filteredCustomers.length} customers
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      <ChevronLeftIcon className="h-4 w-4" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors duration-200 ${currentPage === page ? "bg-[#31BCFF] text-white" : "text-gray-600 hover:bg-gray-100"
                          }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      <ChevronRightIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {paginatedCustomers.map((customer) => (
              <div
                key={customer.id}
                className="group bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-lg"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#31BCFF]/10 text-[#31BCFF]">
                        {isColumnVisible("customerNumber") && customer.customerNumber}
                      </span>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${customer.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          }`}
                      >
                        {isColumnVisible("active") && customer.active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mt-2">{isColumnVisible("customerName") && customer.customerName}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/customers/${customer.id}/edit`}
                      className="p-2 text-gray-400 hover:text-[#31BCFF] hover:bg-blue-50 rounded-lg transition-all duration-200"
                      title="Edit Customer"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(customer.id, customer.customerName)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                      title="Delete Customer"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {customer.email && (
                    <div className="flex items-center text-gray-600">
                      <svg className="w-4 h-4 mr-2 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M21 8v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8"
                        />
                      </svg>
                      <span className="truncate">{isColumnVisible("email") && customer.email}</span>
                    </div>
                  )}
                  {customer.phoneNumber && (
                    <div className="flex items-center text-gray-600">
                      <svg className="w-4 h-4 mr-2 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                        />
                      </svg>
                      <span className="truncate">{isColumnVisible("phoneNumber") && customer.phoneNumber}</span>
                    </div>
                  )}
                  {customer.address && (
                    <div className="flex items-center text-gray-600">
                      <svg className="w-4 h-4 mr-2 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span className="truncate">{isColumnVisible("address") && customer.address}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Mobile Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </button>
                <span className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
