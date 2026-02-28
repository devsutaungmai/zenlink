'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import Swal from 'sweetalert2'
import { AccountType } from '@prisma/client'
import { Switch } from '@/components/ui/switch'
import { ColumnVisibilityToggle } from '@/components/invoice/column-visibility-toggle'
import { useColumnVisibility } from '@/hooks/use-column-visibility'
import { useResizableColumns } from '@/hooks/use-resizable-columns'
import { ResizeHandle } from '@/components/invoice/resize-handle'

export interface LedgerAccount {
    id: string
    accountNumber: number
    name: string
    type: AccountType
    vatCode?: {
        id: string
        code: string
        name: string
    }
    reportGroup: string
    saftStandardAccount: string
    industrySpecification: string
    isActive: boolean
    businessId: string
}

export default function LedgerAccountsPage() {
    const { t } = useTranslation()
    const [ledgerAccounts, setledgerAccounts] = useState<LedgerAccount[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedFilter, setSelectedFilter] = useState('active')

    // Customer columns + usage
    const COLUMNS = [
        { key: "accountNumber", label: "Account Number" },
        { key: "accountName", label: "Account Name" },
        { key: "type", label: "Type" },
        { key: "status", label: "Status" },
        { key: "vatCode", label: "VAT Code" },
        { key: "industrySpecification", label: "Industry Specification" },
        { key: "reportGroup", label: "Report Group" },
        { key: "saftStandardAccount", label: "SAFT Standard Account" },
    ]

    const { columns, toggleColumn, resetColumns, isColumnVisible } = useColumnVisibility({
        storageKey: "ledger-account-columns",
        initialColumns: COLUMNS,
        defaultVisibility: {
            accountNumber: true,
            accountName: true,
            type: true,
            status: true,
            vatCode: false,
            industrySpecification: false,
            reportGroup: false,
            saftStandardAccount: false
        },
    })

    const RESIZABLE_COLUMNS = [
        { key: "accountNumber", initialWidth: 120, minWidth: 60 },
        { key: "accountName", initialWidth: 120, minWidth: 90 },
        { key: "type", initialWidth: 120, minWidth: 50 },
        { key: "status", initialWidth: 120, minWidth: 70 },
        { key: "vatCode", initialWidth: 120, minWidth: 100 },
        { key: "industrySpecification", initialWidth: 120, minWidth: 120 },
        { key: "reportGroup", initialWidth: 130, minWidth: 100 },
        { key: "saftStandardAccount", initialWidth: 120, minWidth: 120 },
        { key: "actions", initialWidth: 120, minWidth: 80 },
    ]
    const { getColumnWidth, onMouseDown, resetWidths } = useResizableColumns({
        storageKey: "ledger-account-col-widths",
        columns: RESIZABLE_COLUMNS,
    })

    useEffect(() => {
        fetchledgerAccounts()
    }, [])

    const fetchledgerAccounts = async () => {
        try {
            setLoading(true)
            setError(null)
            const res = await fetch('/api/ledger/accounts')

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`)
            }

            const data = await res.json()

            if (Array.isArray(data)) {
                setledgerAccounts(data)
            } else {
                console.error('API did not return an array:', data)
                setledgerAccounts([])
                setError('Invalid response format from server')
            }
        } catch (error) {
            console.error('Error fetching ledgerAccounts:', error)
            setError("Error at fetching ledgerAccounts")
            setledgerAccounts([])
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string, accountNumber: number) => {
        try {
            const result = await Swal.fire({
                title: t('common.confirm'),
                text: `Are you sure you want to delete "${accountNumber}"?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#31BCFF',
                cancelButtonColor: '#d33',
                confirmButtonText: t('common.yes'),
                cancelButtonText: t('common.cancel')
            })

            if (result.isConfirmed) {
                const res = await fetch(`/api/ledger/accounts/${id}`, {
                    method: 'DELETE',
                })

                if (!res.ok) {
                    throw new Error('Failed to delete invoice')
                }

                setledgerAccounts(ledgerAccounts.filter(invoice => invoice.id !== id))

                await Swal.fire({
                    title: t('common.success'),
                    text: 'Invoice deleted successfully',
                    icon: 'success',
                    confirmButtonColor: '#31BCFF',
                })
            }
        } catch (error) {
            console.error('Error deleting invoice:', error)
            await Swal.fire({
                title: t('common.error'),
                text: 'Failed to delete invoice',
                icon: 'error',
                confirmButtonColor: '#31BCFF',
            })
        }
    }

    const normalizedSearch = searchTerm.trim().toLowerCase()
    const filteredledgerAccounts = ledgerAccounts.filter(account => {
        const matchesSearch = (
            !normalizedSearch ||
            account.name.toLowerCase().includes(normalizedSearch) ||
            account.accountNumber.toString().includes(normalizedSearch) ||
            account.type.toLowerCase().includes(normalizedSearch)
        );
        const matchesFilter =
            selectedFilter === 'all' ||
            (selectedFilter === 'active' && account.isActive === true) ||
            (selectedFilter === 'inactive' && account.isActive === false);
        return matchesSearch && matchesFilter;
    })

    const handleStatusChange = async (ledgerAccountId: string, newStatus: boolean) => {
        try {
            const res = await fetch(`/api/ledger/accounts/${ledgerAccountId}/toggle-active`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ id: ledgerAccountId, isActive: newStatus }),
            })

            if (res.ok) {
                const updatedAccount = await res.json()
                setledgerAccounts((prevAccounts) =>
                    prevAccounts.map((account) =>
                        account.id === ledgerAccountId ? { ...account, isActive: updatedAccount.isActive } : account,
                    ),
                )
            } else {
                // throw new Error("Failed to update project status")
                console.error("Failed to update ledger account status", await res.text())
                await Swal.fire({
                    title: t("common.error"),
                    text: "Failed to update ledger account status",
                    icon: "error",
                    confirmButtonColor: "#31BCFF",
                })
            }
        } catch (error) {
            console.error("Error updating ledger account status:", error)
            await Swal.fire({
                title: t("common.error"),
                text: "Failed to update ledger account status",
                icon: "error",
                confirmButtonColor: "#31BCFF",
            })
        }
    }

    const handleFilterClick = (filter: string) => () => {
        setSelectedFilter(filter)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#31BCFF]"></div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="text-center text-red-600">
                    {t('common.error')}: {error}
                    <button
                        onClick={fetchledgerAccounts}
                        className="ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                        {t('common.try_again')}
                    </button>
                </div>
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
                            Ledger Account
                        </h1>
                        <p className="mt-2 text-gray-600">
                            Ledger Account for all business
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <Link
                            href="/dashboard/ledger-accounts/create"
                            className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 group"
                        >
                            <PlusIcon className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
                            Create New Ledger Account
                        </Link>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-lg">
                <div className="flex flex-col lg:flex-row gap-4">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search ledger accounts by account number, name, or type"
                            className="block w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                        />
                    </div>
                </div>
                <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
                    <span>
                        Showing {filteredledgerAccounts.length} of {ledgerAccounts.length} accounts
                    </span>
                </div>

                {/* Filter Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
                    <div className="flex flex-wrap items-center gap-2">
                        {/* <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
                            <FunnelIcon className="w-4 h-4 flex-shrink-0" />
                            <span>Filter</span>
                        </div> */}
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

            {/* ledgerAccounts List */}
            {filteredledgerAccounts.length === 0 ? (
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-12 border border-gray-200/50 shadow-lg text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MagnifyingGlassIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No accounts found</h3>
                    <p className="text-gray-500 mb-6">
                        {searchTerm ? 'Try adjusting your search terms' : 'Get started by creating your first ledger account'}
                    </p>
                    {!searchTerm && (
                        <Link
                            href="/dashboard/ledger-accounts/create"
                            className="inline-flex items-center px-6 py-3 rounded-xl bg-[#31BCFF] text-white font-medium hover:bg-[#31BCFF]/90 transition-colors duration-200"
                        >
                            <PlusIcon className="w-5 h-5 mr-2" />
                            Create First Account
                        </Link>
                    )}
                </div>
            ) : (
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full" style={{ tableLayout: "fixed" }}>
                            <colgroup>
                                {isColumnVisible("accountNumber") && (
                                    <col style={{ width: getColumnWidth("accountNumber") }} />
                                )}
                                {isColumnVisible("accountName") && (
                                    <col style={{ width: getColumnWidth("accountName") }} />
                                )}
                                {isColumnVisible("type") && (
                                    <col style={{ width: getColumnWidth("type") }} />
                                )}
                                {isColumnVisible("vatCode") && (
                                    <col style={{ width: getColumnWidth("vatCode") }} />
                                )}
                                {isColumnVisible("industrySpecification") && (
                                    <col style={{ width: getColumnWidth("industrySpecification") }} />
                                )}
                                {isColumnVisible("reportGroup") && (
                                    <col style={{ width: getColumnWidth("reportGroup") }} />
                                )}
                                {isColumnVisible("saftStandardAccount") && (
                                    <col style={{ width: getColumnWidth("saftStandardAccount") }} />
                                )}
                                {isColumnVisible("status") && (
                                    <col style={{ width: getColumnWidth("status") }} />
                                )}
                                <col style={{ width: getColumnWidth("actions") }} />
                            </colgroup>
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                <tr>
                                    {isColumnVisible("accountNumber") && (
                                        <th className="relative px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase select-none border-r border-border">
                                            Account Number

                                            <ResizeHandle onMouseDown={onMouseDown("accountNumber")} />

                                        </th>
                                    )}
                                    {isColumnVisible("accountName") && (
                                        <th className="relative px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase select-none border-r border-border">
                                            Account Name
                                            <ResizeHandle onMouseDown={onMouseDown("accountName")} />

                                        </th>
                                    )}
                                    {isColumnVisible("type") && (
                                        <th className="relative px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase select-none border-r border-border">
                                            Type
                                            <ResizeHandle onMouseDown={onMouseDown("type")} />
                                        </th>
                                    )}
                                    {isColumnVisible("vatCode") && (
                                        <th className="relative px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase select-none border-r border-border">
                                            VAT Code
                                            <ResizeHandle onMouseDown={onMouseDown("vatCode")} />
                                        </th>
                                    )}
                                    {isColumnVisible("industrySpecification") && (
                                        <th className="relative px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase select-none border-r border-border">
                                            Industry Specification
                                            <ResizeHandle onMouseDown={onMouseDown("industrySpecification")} />
                                        </th>
                                    )}
                                    {isColumnVisible("reportGroup") && (
                                        <th className="relative px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase select-none border-r border-border">
                                            Report Group
                                            <ResizeHandle onMouseDown={onMouseDown("reportGroup")} />
                                        </th>
                                    )}
                                    {isColumnVisible("saftStandardAccount") && (
                                        <th className="relative px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase select-none border-r border-border">
                                            SAFT Standard Account
                                            <ResizeHandle onMouseDown={onMouseDown("saftStandardAccount")} />
                                        </th>
                                    )}
                                    {isColumnVisible("status") && (
                                        <th className="relative px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase select-none border-r border-border">
                                            Status
                                            <ResizeHandle onMouseDown={onMouseDown("status")} />
                                        </th>
                                    )}
                                    <th className="relative px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase border-r border-border">
                                        <div className="flex items-center justify-end gap-2">
                                            <span>{t('actions')}</span>
                                            <ColumnVisibilityToggle
                                                columns={columns}
                                                onColumnToggle={toggleColumn}
                                                onResetColumns={() => {
                                                    resetColumns()
                                                    resetWidths()
                                                }}
                                            />
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200/50">
                                {filteredledgerAccounts.map((account) => (
                                    <tr key={account.id} className="hover:bg-blue-50/30 transition-colors duration-200">
                                        {isColumnVisible("accountNumber") && (
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {account.accountNumber}
                                                </div>
                                            </td>
                                        )}
                                        {isColumnVisible("accountName") && (
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900">
                                                    {account.name}
                                                </div>
                                            </td>
                                        )}
                                        {isColumnVisible("type") && (
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">
                                                    {account.type}
                                                </div>
                                            </td>
                                        )}
                                        {isColumnVisible("vatCode") && (
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">
                                                    {account.vatCode?.name ?? "-"}
                                                </div>
                                            </td>
                                        )}
                                        {isColumnVisible("industrySpecification") && (
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-gray-900 truncate max-w-[200px]">
                                                    {account.industrySpecification || "-"}
                                                </div>
                                            </td>
                                        )}
                                        {isColumnVisible("reportGroup") && (
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900 truncate max-w-[200px]" title={account.reportGroup || ""}>
                                                    {account.reportGroup ? `${account.reportGroup.substring(0, 10)}...` : "-"}
                                                </div>
                                            </td>
                                        )}
                                        {isColumnVisible("saftStandardAccount") && (
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900" title={account.saftStandardAccount || ""}>
                                                    {account.saftStandardAccount ? `${account.saftStandardAccount.substring(0, 10)}...` : "-"}
                                                </div>
                                            </td>
                                        )}
                                        {isColumnVisible("status") && (
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className="flex items-center justify-center">
                                                    <Switch
                                                        id="status"
                                                        checked={account.isActive}
                                                        onCheckedChange={(checked) => handleStatusChange(account.id, checked)}
                                                    />
                                                </div>
                                            </td>
                                        )}
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link
                                                    href={`/dashboard/ledger-accounts/${account.id}/edit?default=${account.businessId === null}`}
                                                    className="p-2 text-gray-400 hover:text-[#31BCFF] hover:bg-blue-50 rounded-lg transition-all duration-200"
                                                    title="Edit Account"
                                                >
                                                    <PencilIcon className="h-4 w-4" />
                                                </Link>
                                                {account.businessId !== null && (
                                                    <button
                                                        onClick={() => handleDelete(account.id, account.accountNumber)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                                        title="Delete Account"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards  */}
                    <div className="md:hidden space-y-4 p-4">
                        {filteredledgerAccounts.map((account) => (
                            <div
                                key={account.id}
                                className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden hover:shadow-xl transition-all duration-200"
                            >
                                {/* Card Header */}
                                <div className="p-4 bg-gradient-to-r from-gray-50 to-blue-50/30">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap mb-2">
                                                <span className="text-base font-bold text-gray-900">
                                                    {account.accountNumber}
                                                </span>
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {account.name}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="p-4 space-y-3">
                                    {/* Account Information */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <div className="text-xs text-gray-500 mb-1">Account Type</div>
                                            <div className="text-sm font-medium text-gray-900">
                                                {account.type}
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-3">
                                            <div className="text-xs text-gray-500 mb-1">Status</div>
                                            <div className="text-sm font-medium text-gray-900">
                                                {/* {account.isActive ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                        Inactive
                                                    </span>
                                                )} */}
                                                <div className="flex items-center">
                                                    <Switch
                                                        id="status"
                                                        checked={account.isActive}
                                                        onCheckedChange={(checked) => handleStatusChange(account.id, checked)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
                                        {account.businessId !== null ? (
                                            <>
                                                <Link
                                                    href={`/dashboard/ledger-accounts/${account.id}/edit`}
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                                                    title="Edit Account"
                                                >
                                                    <PencilIcon className="h-5 w-5" />
                                                </Link>
                                                <button
                                                    onClick={() => handleDelete(account.id, account.accountNumber)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                                    title="Delete Account"
                                                >
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            </>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}