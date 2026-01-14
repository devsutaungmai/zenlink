'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'
import { AccountType } from '@prisma/client'
import { getAccountType } from '@/shared/lib/invoiceHelper'


interface AccountLedgerForm {
    accountNumber: number
    name: string
    type: AccountType
    isActive: boolean
    industrySpecification: string
    reportGroup: string
    saftStandardAccount: string
    vatCodeId: string
}

interface VatCode {
    id: string
    code: string
    name: string
    rate: number
}

export default function EditLedgerAccountPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = use(params)
    const router = useRouter()
    const [loading, setLoading] = useState(false)
    const [isAccountInUse, setIsAccountInUse] = useState(false)
    const [vatCodes, setVatCodes] = useState<VatCode[]>([]);

    const [formData, setFormData] = useState<AccountLedgerForm>({
        accountNumber: 0,
        name: '',
        type: AccountType.ASSET,
        isActive: true,
        industrySpecification: '',
        reportGroup: '',
        saftStandardAccount: '',
        vatCodeId: ''
    })

    useEffect(() => {
        fetchLedgerAccount()
        checkledgerAccountInUse(resolvedParams.id)
    }, [resolvedParams.id])

    const fetchLedgerAccount = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/ledger/accounts/${resolvedParams.id}`)
            if (res.ok) {
                const data = await res.json()
                console.log("LedgerAccount", JSON.stringify(data));
                setFormData({
                    accountNumber: data.accountNumber ?? 0,
                    name: data.name || '',
                    type: (data.type as AccountType) ?? AccountType.ASSET,
                    isActive: data.isActive ?? true,
                    industrySpecification: data.industrySpecification || '',
                    reportGroup: data.reportGroup || '',
                    saftStandardAccount: data.saftStandardAccount || '',
                    vatCodeId: data.vatCodeId || ''
                })
            }
        } catch (error) {
            console.error('Error fetching LedgerAccount:', error)
        } finally {
            setLoading(false)
        }
    }

     const checkledgerAccountInUse = async (id: string): Promise<void> => {
         try {
            setLoading(true)
            const res = await fetch(`/api/ledger/accounts/${id}/in-use`)

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`)
            }

            const data = await res.json()
            setIsAccountInUse(data.inUse)

        } catch (error) {
            console.error('Error fetching ledger account in use status:', error)
            setIsAccountInUse(false)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const res = await fetch(`/api/ledger/accounts/${resolvedParams.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Failed to update ledger account')
            }

            await Swal.fire({
                title: 'Success!',
                text: 'Ledger account updated successfully',
                icon: 'success',
                confirmButtonColor: '#31BCFF',
            })

            router.push('/dashboard/ledger-accounts')
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

     const fetchVatCodes = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/ledger/vat-codes', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Failed to fetch VAT codes')
            }

            const data = await res.json()

            setVatCodes(Array.isArray(data) ? data : data.vatCodes ?? [])

        } catch (error) {
            console.error('Error fetching VAT codes:', error)
            return []
        }
        finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchVatCodes();
    }, []);

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Link
                                href="/dashboard/ledger-accounts"
                                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                            >
                                <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                            </Link>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                Edit Ledger Account
                            </h1>
                        </div>
                        <p className="mt-2 text-gray-600 ml-14">
                            Update a new ledger account to your chart of accounts
                        </p>
                    </div>
                    <div className="hidden md:flex items-center space-x-2">
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
                            id="isActive"
                            type="checkbox"
                            checked={formData.isActive}
                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                            className="h-5 w-5 text-[#31BCFF] border-gray-300 rounded focus:ring-[#31BCFF]/50"
                        />
                        <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                            Active
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-2">
                                Account Number *
                            </label>
                            <input
                                type="number"
                                id="accountNumber"
                                required
                                value={formData.accountNumber || ''}
                                disabled={isAccountInUse}
                                onChange={(e) => {
                                    setFormData({ ...formData, accountNumber: e.target.value ? parseInt(e.target.value, 10) : 0 })
                                    const accountType = getAccountType(parseInt(e.target.value, 10));
                                    setFormData(prev => ({ ...prev, type: accountType }));
                                }}
                                className={`block w-full px-4 py-3 rounded-xl border backdrop-blur-sm placeholder-gray-500 transition-all duration-200 ${
                                    isAccountInUse
                                        ? 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed opacity-70'
                                        : 'border-gray-300 bg-white/70 text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF]'
                                }`}
                                placeholder="Enter account number"
                                title={isAccountInUse ? 'Account number cannot be edited because this account is in use' : 'Enter account number'}
                                aria-disabled={isAccountInUse}
                            />
                        </div>

                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                                Account Name *
                            </label>
                            <input
                                type="text"
                                id="name"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                                placeholder="Enter account name"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                                Type *
                            </label>
                            <select
                                id="type"
                                required
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value as AccountType })}
                                className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                            >
                                <option value="EXPENSE">EXPENSE</option>
                                <option value="APPROPRIATIONS">APPROPRIATIONS</option>
                                <option value="ASSET">ASSET</option>
                                <option value="LIABILITY">LIABILITY</option>
                                <option value="EQUITY">EQUITY</option>
                                <option value="INCOME">INCOME</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="vatCodeId" className="block text-sm font-medium text-gray-700 mb-2">
                                VAT Code
                            </label>
                            <select
                                id="vatCodeId"
                                required
                                value={formData.vatCodeId}
                                onChange={(e) => setFormData({ ...formData, vatCodeId: e.target.value })}
                                className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                            >
                                <option value="">Select VAT Code</option>
                                {vatCodes.map((vatCode) => (
                                    <option key={vatCode.id} value={vatCode.id}>
                                        {vatCode.code} - {vatCode.name} ({vatCode.rate}%)
                                    </option>
                                ))}
                            </select>
                        </div>


                    </div>


                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="industrySpecification" className="block text-sm font-medium text-gray-700 mb-2">
                                Industry Specification
                            </label>
                            <input
                                type="text"
                                id="industrySpecification"
                                value={formData.industrySpecification}
                                onChange={(e) => setFormData({ ...formData, industrySpecification: e.target.value })}
                                className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                                placeholder="Enter industry specification"
                            />
                        </div>

                        <div>
                            <label htmlFor="reportGroup" className="block text-sm font-medium text-gray-700 mb-2">
                                Report Group
                            </label>
                            <input
                                type="text"
                                id="reportGroup"
                                value={formData.reportGroup}
                                onChange={(e) => setFormData({ ...formData, reportGroup: e.target.value })}
                                className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                                placeholder="Enter report group"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="saftStandardAccount" className="block text-sm font-medium text-gray-700 mb-2">
                            SAFT Standard Account
                        </label>
                        <input
                            type="text"
                            id="saftStandardAccount"
                            value={formData.saftStandardAccount}
                            onChange={(e) => setFormData({ ...formData, saftStandardAccount: e.target.value })}
                            className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                            placeholder="Enter SAFT standard account"
                        />
                    </div>

                    {/* Form Actions */}
                    <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
                        <Link
                            href="/dashboard/ledger-accounts"
                            className="px-6 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-200"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            {loading ? 'Updating...' : 'Update Ledger Account'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
