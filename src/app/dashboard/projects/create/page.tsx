'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import Cog6ToothIcon from '@heroicons/react/24/solid/Cog6ToothIcon'
import { useProjectSettings } from '@/shared/hooks/useProjectSettings'
import { ProjectFieldSettingsDialog } from '@/components/invoice/ProjectFieldSettingsDialog'
import { useAutoFocus } from '@/shared/hooks/useAutoFocus'
import { formatProjectNumberForDisplay } from '@/shared/lib/invoiceHelper'
import { get } from 'http'
import { projectValidationSchema } from '@/components/invoice/validation'
import z from 'zod'

interface Customer {
    id: string
    customerName: string
}
interface ProjectCategory {
    id: string
    name: string
}

export default function CreateProjectPage() {
    const router = useRouter()
    const { t } = useTranslation()
    const [loading, setLoading] = useState(false)
    const [customers, setCustomers] = useState<Customer[]>([])
    const [projectCategories, setProjectCategories] = useState<ProjectCategory[]>([])
    const today = new Date().toISOString().split("T")[0];
    const [formData, setFormData] = useState<{
        name: string
        projectNumber: string
        defaultProjectNumber?: string
        active: boolean
        sequence: number
        year: number
        categoryId: string
        startDate: string
        endDate: string
        customerId: string
    }>({
        name: '',
        projectNumber: '',
        defaultProjectNumber: '',
        active: true,
        sequence: 0,
        year: new Date().getFullYear(),
        categoryId: '',
        startDate: today,
        endDate: '',
        customerId: ''
    })
    const firstInputRef = useAutoFocus<HTMLInputElement>()

    const { settings, refetch } = useProjectSettings();
    const [visibleFields, setVisibleFields] = useState({
        showCategory: true,
        showCustomer: true,
        showStartDate: true,
        showEndDate: true,
    })
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
    const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (settings) {
            setVisibleFields({
                showCategory: settings.showCategory,
                showCustomer: settings.showCustomer,
                showStartDate: settings.showStartDate,
                showEndDate: settings.showEndDate,
            })
        }
    }, [settings])

    useEffect(() => {
        fetchProjectCategories()
        fetchCustomers()
        getDefaultProjectNumber()
    }, [])

    const getDefaultProjectNumber = async () => {
        try {
            const res = await fetch('/api/projects/next-number')

            if (res.ok) {
                const data = await res.json()
                const defaultNumber = formatProjectNumberForDisplay(data.projectNumber);

                setFormData(prev => ({
                    ...prev, projectNumber: defaultNumber, defaultProjectNumber: data.projectNumber, sequence: data.sequence,
                    year: data.year
                }))
            }
        } catch (error) {
            console.error('Error fetching default project number:', error)
        }
    }

    const validateField = (fieldName: string, value: any) => {
        try {
            const fieldSchema = projectValidationSchema.shape[fieldName as keyof typeof projectValidationSchema.shape]
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

    const fetchProjectCategories = async () => {
        try {
            const res = await fetch('/api/project-categories')
            if (res.ok) {
                const data = await res.json()
                setProjectCategories(data)
            }
        } catch (error) {
            console.error('Error fetching project category:', error)
        }
    }

    const fetchCustomers = async () => {
        try {
            const res = await fetch('/api/customers')
            if (res.ok) {
                const data = await res.json()
                setCustomers(data)
            }
        } catch (error) {
            console.error('Error fetching customers:', error)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        // Validate all fields before submission
        try {
            projectValidationSchema.parse(formData)
            setValidationErrors({})
        } catch (error) {

            if (error instanceof z.ZodError) {
                const errors: Record<string, string> = {}

                error.issues.forEach(issue => {
                    if (issue.path[0]) {
                        errors[issue.path[0].toString()] = issue.message
                    }
                })
                setValidationErrors(errors)

                // Show specific message if customerContacts is the issue
                const contactError = error.issues.find(issue =>
                    issue.path[0] === 'customerContacts'
                )

                await Swal.fire({
                    text: contactError?.message || 'Please fix the errors in the form',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 3500,
                    timerProgressBar: true,
                    icon: 'error',
                    customClass: {
                        popup: 'swal-toast-wide'
                    }
                })
                return
            }
        }
        setLoading(true)

        try {
            const res = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Failed to create project')
            }

            await Swal.fire({
                text: 'Project created successfully',
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


            router.push('/dashboard/projects')
            router.refresh()
        } catch (error) {
            await Swal.fire({
                text: error instanceof Error ? error.message : 'An error occurred',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true,
                icon: 'error',
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
                                href="/dashboard/projects"
                                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                            >
                                <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                            </Link>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                Create Project
                            </h1>
                        </div>
                        <p className="mt-2 text-gray-600 ml-14">
                            Add a new project to track your work and progress
                        </p>
                    </div>
                    <div className="hidden md:flex items-center space-x-2">
                        <ProjectFieldSettingsDialog initialSettings={visibleFields} onSettingsSaved={(newSettings) => {
                            setVisibleFields(newSettings)

                        }} onRefresh={refetch} />
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
                    {/* Active Checkbox */}
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
                    {/* Project Name & Project Number */}
                    <div className="flex flex-wrap gap-6 mt-6">
                        <div className="grow basis-[calc(20%-12px)] min-w-[150px]">
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                                Project Name *
                            </label>
                            <input
                                ref={firstInputRef}
                                type="text"
                                id="name"
                                value={formData.name}
                                onChange={(e) => { setFormData({ ...formData, name: e.target.value }); debouncedValidation('name', e.target.value) }}
                                onBlur={(e) => validateField('name', e.target.value)}
                                className={`block w-full px-4 py-3 rounded-xl border ${validationErrors.name ? 'border-red-500' : 'border-gray-300'} bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200`}
                                placeholder="Enter project name"
                            />
                            {validationErrors.name && (
                                <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
                            )}
                        </div>

                        <div className="grow basis-[calc(20%-12px)] min-w-[150px]">
                            <label htmlFor="projectNumber" className="block text-sm font-medium text-gray-700 mb-2">
                                Project Number *
                            </label>
                            <input
                                type="text"
                                id="projectNumber"
                                value={formData.projectNumber}
                                onChange={(e) => { setFormData({ ...formData, projectNumber: e.target.value }); debouncedValidation('projectNumber', e.target.value) }}
                                onBlur={(e) => validateField('projectNumber', e.target.value)}
                                className={`block w-full px-4 py-3 rounded-xl border ${validationErrors.projectNumber ? 'border-red-500' : 'border-gray-300'} bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200`}
                                placeholder="Enter project number"
                            />
                            {validationErrors.projectNumber && (
                                <p className="mt-1 text-sm text-red-600">{validationErrors.projectNumber}</p>
                            )}
                        </div>

                        {/* Category & Customer */}
                        {visibleFields.showCategory
                            && <div className="grow basis-[calc(20%-12px)] min-w-[150px]">
                                <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700 mb-2">
                                    Category
                                </label>
                                <select
                                    id="categoryId"
                                    value={formData.categoryId}
                                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                                    className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                                >
                                    <option value="">Select Category</option>
                                    {projectCategories.map((category) => (
                                        <option key={category.id} value={category.id}>
                                            {category.name}
                                        </option>
                                    ))}
                                </select>
                            </div>}

                        {visibleFields.showCustomer &&
                            <div className="grow basis-[calc(20%-12px)] min-w-[150px]">
                                <label htmlFor="customerId" className="block text-sm font-medium text-gray-700 mb-2">
                                    Customer
                                </label>
                                <select
                                    id="customerId"
                                    value={formData.customerId}
                                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                                    className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                                >
                                    <option value="">Select Customer</option>
                                    {customers.map((cus) => (
                                        <option key={cus.id} value={cus.id}>
                                            {cus.customerName}
                                        </option>
                                    ))}
                                </select>
                            </div>}

                        {/* Start Date & End Date */}
                        {visibleFields.showStartDate &&
                            <div className="grow basis-[calc(20%-12px)] min-w-[150px]">
                                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    id="startDate"
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                                />
                            </div>}

                        {visibleFields.showEndDate
                            && <div className="grow basis-[calc(20%-12px)] min-w-[150px]">
                                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    id="endDate"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    className="block w-full px-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                                />
                            </div>}
                    </div>

                    {/* Form Actions */}
                    <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
                        <Link
                            href="/dashboard/projects"
                            className="px-6 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 font-medium hover:bg-gray-50 transition-colors duration-200"
                        >
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            {loading ? 'Creating...' : 'Create Project'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}