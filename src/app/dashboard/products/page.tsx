"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline"
import { useTranslation } from "react-i18next"
import Swal from "sweetalert2"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { ColumnVisibilityToggle } from "@/components/invoice/column-visibility-toggle"
import { useColumnVisibility } from "@/hooks/use-column-visibility"
import { Switch } from "@/components/ui/switch"
import { FunnelIcon } from "lucide-react"

interface Unit {
  id: string
  name: string
  symbol?: string | null
  description?: string | null
}

interface ProductGroup {
  id: string
  name: string
  code?: string | null
  description?: string | null
}

interface SalesAccount {
  id: string
  accountNumber: string
  accountName: string
  description?: string | null
  isActive: boolean
}

interface BusinessVatCode {
  vatCode: {
    code: string
    rate: number
  }
}

interface Product {
  id: string
  active: boolean
  productNumber: string
  productName: string
  salesPrice: number
  costPrice: number
  discountPercentage?: number | null
  ledgerAccount: {
    id:string,
    name: string
    accountNumber: string,
    businessId: string,
    vatCode: {
      code: string
      rate: number
    }
    businessVatCodes: BusinessVatCode[]
  }

  // Foreign keys
  unitId?: string | null
  productGroupId?: string | null
  salesAccountId?: string | null

  // Optional related data
  unit?: Unit | null
  productGroup?: ProductGroup | null
  salesAccount?: SalesAccount | null
}

export default function ProductsPage() {
  const { t } = useTranslation()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [selectedFilter, setSelectedFilter] = useState('all')

  // Define columns configuration
  const COLUMNS = [
    { key: "productNumber", label: "Product Number" },
    { key: "productName", label: "Product Name" },
    { key: "ledgerAccount", label: "Ledger Account" },
    { key: "salesPrice", label: "Sales Price" },
    { key: "costPrice", label: "Cost Price" },
    { key: "vatRate", label: "VAT %" },
    { key: "discount", label: "Discount %" },
    { key: "status", label: "Status" },
  ]

  const { columns, toggleColumn, resetColumns, isColumnVisible } = useColumnVisibility({
    storageKey: "products-columns",
    initialColumns: COLUMNS,
    defaultVisibility: {
      productNumber: true,
      productName: true,
      ledgerAccount: true,
      salesPrice: true,
      costPrice: true,
      vatRate: true,
      discount: true,
      status: true,
    },
  })

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products")

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`)
      }

      const data = await res.json()

      if (Array.isArray(data)) {
        setProducts(data)
      } else {
        console.error("API did not return an array:", data)
        setProducts([])
      }
    } catch (error) {
      console.error("Error fetching products:", error)
      setProducts([])
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
        const res = await fetch(`/api/products/${id}`, {
          method: "DELETE",
        })

        if (res.ok) {
          setProducts(products.filter((cust) => cust.id !== id))

          await Swal.fire({
            title: t("common.success"),
            text: "Product deleted successfully",
            icon: "success",
            confirmButtonColor: "#31BCFF",
          })
        } else {
          throw new Error("Failed to delete product")
        }
      }
    } catch (error) {
      console.error("Error deleting product:", error)
      await Swal.fire({
        title: t("common.error"),
        text: "Failed to delete product",
        icon: "error",
        confirmButtonColor: "#31BCFF",
      })
    }
  }

  const handleFilterClick = (filter: string) => () => {
    setSelectedFilter(filter)
    setCurrentPage(1)
  }

  const filteredCustomers = products.filter((product) => {
   const matchesSearch = product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.productNumber.toLowerCase().includes(searchTerm.toLowerCase())
   const matchesFilter =
      selectedFilter === 'all' ||
      (selectedFilter === 'active' && product.active) ||
      (selectedFilter === 'inactive' && !product.active)

    return matchesSearch && matchesFilter
  })
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedProducts = filteredCustomers.slice(startIndex, endIndex)

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleStatusChange = async (productId: string, newStatus: boolean) => {
    try {
      const res = await fetch(`/api/products/${productId}/toggle-active`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: productId, active: newStatus }),
      })

      if (res.ok) {
        const updatedProduct = await res.json()
        setProducts((prevProducts) =>
          prevProducts.map((product) =>
            product.id === productId ? { ...product, active: updatedProduct.active } : product,
          ),
        )
      } else {
        // throw new Error("Failed to update product status")
        await Swal.fire({
          title: t("common.error"),
          text: "Failed to update product status",
          icon: "error",
          confirmButtonColor: "#31BCFF",
        })
      }
    } catch (error) {
      console.error("Error updating product status:", error)
      await Swal.fire({
        title: t("common.error"),
        text: "Failed to update product status",
        icon: "error",
        confirmButtonColor: "#31BCFF",
      })
    }
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
              Products
            </h1>
            <p className="mt-2 text-gray-600">Manage product for invoice</p>
            <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
              <span className="flex items-center">
                <div className="w-2 h-2 bg-[#31BCFF] rounded-full mr-2"></div>
                {products.length} {products.length === 1 ? "product" : "products"}
              </span>
            </div>
          </div>
          <Link
            href="/dashboard/products/create"
            className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 group"
          >
            <PlusIcon className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
            Create Product
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
              placeholder="Search products..."
              className="block w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
            />
          </div>
        </div>
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>
            {filteredCustomers.length > 0
              ? `Showing ${startIndex + 1}-${Math.min(endIndex, filteredCustomers.length)} of ${filteredCustomers.length}`
              : `Showing 0 of ${products.length}`}
          </span>
          {totalPages > 1 && (
            <span className="text-xs text-gray-400">
              Page {currentPage} of {totalPages}
            </span>
          )}
        </div>
        {/* Filter Buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
              <FunnelIcon className="w-4 h-4 flex-shrink-0" />
              <span>Filter</span>
            </div>
            {[
              { value: 'all', label: "ALL" },
              { value: 'active', label: "ACTIVE" },
              { value: 'inactive', label: "INACTIVE" },
            ].map((filter) => (
              <button
                key={filter.value}
                onClick={handleFilterClick(filter.value)}
                className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${selectedFilter === filter.value
                  ? 'bg-[#31BCFF] text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Products List */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-12 border border-gray-200/50 shadow-lg text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-500 mb-6">
            {searchTerm ? "Try adjusting your search terms" : "Get started by creating your first product"}
          </p>
          {!searchTerm && (
            <Link
              href="/dashboard/products/create"
              className="inline-flex items-center px-6 py-3 rounded-xl bg-[#31BCFF] text-white font-medium hover:bg-[#31BCFF]/90 transition-colors duration-200"
            >
              <PlusIcon className="w-5 h-5 mr-2" />
              Create First Product
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  {isColumnVisible("productNumber") && (
                    <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Product Number
                    </th>
                  )}
                  {isColumnVisible("productName") && (
                    <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Product Name
                    </th>
                  )}
                  {isColumnVisible("ledgerAccount") && (
                    <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Ledger Account
                    </th>
                  )}
                  {isColumnVisible("salesPrice") && (
                    <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Sales Price
                    </th>
                  )}
                  {isColumnVisible("costPrice") && (
                    <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Cost Price
                    </th>
                  )}
                  {isColumnVisible("vatRate") && (
                    <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      VAT %
                    </th>
                  )}
                  {isColumnVisible("discount") && (
                    <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Discount %
                    </th>
                  )}
                  {isColumnVisible("status") && (
                    <th className="px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                  )}
                  <th className="px-6 py-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
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
              <tbody className="divide-y divide-gray-200/50">
                {paginatedProducts.map((product) => 
                { const isDefaultLedgerAccount = product.ledgerAccount.businessId == null ? "true" : "false";
                  return (
                  <tr key={product.id} className="hover:bg-blue-50/30 transition-colors duration-200">
                    {isColumnVisible("productNumber") && (
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">{product.productNumber}</div>
                      </td>
                    )}

                    {isColumnVisible("productName") && (
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{product.productName}</div>
                      </td>
                    )}

                    {isColumnVisible("ledgerAccount") && (
                      <td className="px-6 py-4">
                        <Link href={`/dashboard/ledger-accounts/${product.ledgerAccount.id}/edit?default=${isDefaultLedgerAccount}`} className="hover:underline">
                          <div className="text-sm text-blue-600 hover:underline">{product.ledgerAccount.name} ({product.ledgerAccount.accountNumber})</div>
                        </Link>
                      </td>
                    )}

                    {isColumnVisible("salesPrice") && (
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{Number(product.salesPrice).toFixed(2)}</div>
                      </td>
                    )}

                    {isColumnVisible("costPrice") && (
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{Number(product.costPrice).toFixed(2)}</div>
                      </td>
                    )}

                    {isColumnVisible("vatRate") && (
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {product.ledgerAccount.businessVatCodes.length > 0
                            ? `${product.ledgerAccount.businessVatCodes[0].vatCode.rate}%`
                            : product.ledgerAccount.vatCode
                              ? `${product.ledgerAccount.vatCode.rate}%`
                              : "0%"}
                        </div>
                      </td>
                    )}


                    {isColumnVisible("discount") && (
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{product.discountPercentage ? `${product.discountPercentage}%` : "-"}</div>
                      </td>
                    )}

                    {isColumnVisible("status") && (
                      <td className="px-6 py-4">
                        {/* <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${product.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                            }`}
                        >
                          {product.active ? "Active" : "Inactive"}
                        </span> */}
                        <div className="flex items-center space-x-2">
                          <Switch
                            id="status"
                            checked={product.active}
                            onCheckedChange={(checked) => handleStatusChange(product.id, checked)}
                          />
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/products/${product.id}/edit`}
                          className="p-2 text-gray-400 hover:text-[#31BCFF] hover:bg-blue-50 rounded-lg transition-all duration-200"
                          title="Edit Product"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(product.id, product.productName)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                          title="Delete Product"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="hidden md:flex items-center justify-center px-6 py-4 border-t border-gray-200/50">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                      className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => handlePageChange(page)}
                            isActive={page === currentPage}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )
                    }
                    return null
                  })}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                      className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}

          <div className="md:hidden space-y-4 p-4">
            {paginatedProducts.map((product) => (
              <div
                key={product.id}
                className="group bg-white rounded-2xl p-6 border border-gray-200/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-[#31BCFF]/30"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#31BCFF] transition-colors duration-200">
                        {isColumnVisible("productName") && product.productName}
                      </h3>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${product.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                          }`}
                      >
                        {isColumnVisible("status") && (product.active ? "Active" : "Inactive")}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/dashboard/products/${product.id}/edit`}
                      className="p-2 text-gray-400 hover:text-[#31BCFF] hover:bg-blue-50 rounded-lg transition-all duration-200"
                      title="Edit Product"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Link>
                    <button
                      onClick={() => handleDelete(product.id, product.productName)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                      title="Delete Product"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-[#31BCFF]/10 rounded-lg flex items-center justify-center mr-3">
                        <svg className="w-5 h-5 text-[#31BCFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                          />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Product Number</p>
                        <p className="text-lg font-bold text-gray-900">{product.productNumber}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Price Information */}
                <div className="grid grid-cols-2 gap-3">
                  {isColumnVisible("salesPrice") && <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Sales Price</div>
                    <div className="text-sm font-medium text-gray-900">{Number(product.salesPrice).toFixed(2)}</div>
                  </div>}
                  {isColumnVisible("costPrice") && <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Cost Price</div>
                    <div className="text-sm font-medium text-gray-900">{Number(product.costPrice).toFixed(2)}</div>
                  </div>}
                  {isColumnVisible("vatRate") && <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Vat Percentage</div>
                    <div className="text-sm font-medium text-gray-900">{(product.ledgerAccount?.vatCode?.rate ?? 0)}%</div>
                  </div>}
                </div>

                {isColumnVisible("discount") && product.discountPercentage && (
                  <div className="mt-3 bg-orange-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">Discount</div>
                    <div className="text-sm font-medium text-orange-700">{product.discountPercentage}%</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
