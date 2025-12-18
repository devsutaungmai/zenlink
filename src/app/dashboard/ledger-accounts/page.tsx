'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import Swal from 'sweetalert2'
import { AccountType } from '@prisma/client'

export interface LedgerAccount {
    id: string
    accountNumber: number
    name: string
    type: AccountType
    isActive: boolean
    businessId: string
}

export default function LedgerAccountsPage() {
    const { t } = useTranslation()
    const [ledgerAccounts, setledgerAccounts] = useState<LedgerAccount[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState('')

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
        if (!normalizedSearch) return true
        return (
            account.name.toLowerCase().includes(normalizedSearch) ||
            account.accountNumber.toString().includes(normalizedSearch) ||
            account.type.toLowerCase().includes(normalizedSearch)
        )
    })

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
                        <table className="w-full">
                            <thead className="bg-gray-50/80">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Account Number
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Account Name
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Type
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        {t('actions')}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200/50">
                                {filteredledgerAccounts.map((account) => (
                                    <tr key={account.id} className="hover:bg-blue-50/30 transition-colors duration-200">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">
                                                {account.accountNumber}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">
                                                {account.name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-900">
                                                {account.type}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {account.isActive ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {account.businessId !== null ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <Link
                                                        href={`/dashboard/ledger-accounts/${account.id}/edit`}
                                                        className="p-2 text-gray-400 hover:text-[#31BCFF] hover:bg-blue-50 rounded-lg transition-all duration-200"
                                                        title="Edit Account"
                                                    >
                                                        <PencilIcon className="h-4 w-4" />
                                                    </Link>
                                                    <button
                                                        onClick={() => handleDelete(account.id, account.accountNumber)}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                                        title="Delete Account"
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ) : null
                                            }
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
                                                {account.isActive ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                        Inactive
                                                    </span>
                                                )}
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