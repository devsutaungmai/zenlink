'use client'

import { useState, useEffect, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'
import { useProjectSettings } from '@/shared/hooks/useProjectSettings'
import { ProjectFieldSettingsDialog } from '@/components/invoice/ProjectFieldSettingsDialog'
import { formatProjectNumberForDisplay } from '@/shared/lib/invoiceHelper'
import { projectValidationSchema } from '@/components/invoice/validation'
import z from 'zod'
import { useHasChanges } from '@/hooks/useHasChanges'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle } from 'lucide-react'

interface Customer {
    id: string
    customerName: string
}
interface ProjectCategory {
    id: string
    name: string
}

interface EditProjectPageProps {
    params: Promise<{ id: string }>
}

export default function EditProjectPage({ params }: EditProjectPageProps) {
    const resolvedParams = use(params)
    const router = useRouter()
    const { t } = useTranslation()
    const [loading, setLoading] = useState(false)
    const [initialLoading, setInitialLoading] = useState(true)
    const [customers, setCustomers] = useState<Customer[]>([])
    const [projectCategories, setProjectCategories] = useState<ProjectCategory[]>([])

    const [formData, setFormData] = useState({
        name: '',
        projectNumber: '',
        active: true,
        categoryId: '',
        startDate: '',
        endDate: '',
        customerId: ''
    })
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
    const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const { hasChanges, resetChanges, setInitialData } = useHasChanges(formData);

    useEffect(() => {
        // fetchProjectCategories()
        fetchCustomers()
        fetchProject()
    }, [resolvedParams.id])

    const { settings, refetch } = useProjectSettings();
    const [visibleFields, setVisibleFields] = useState({
        // showCategory: true,
        showCustomer: false,
        showStartDate: false,
        showEndDate: false,
    })

    useEffect(() => {
        if (settings) {
            setVisibleFields({
                // showCategory: settings.showCategory,
                showCustomer: settings.showCustomer,
                showStartDate: settings.showStartDate,
                showEndDate: settings.showEndDate,
            })
        }
    }, [settings])
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

    const fetchProject = async () => {
        try {
            const res = await fetch(`/api/projects/${resolvedParams.id}`)
            if (res.ok) {
                const data = await res.json()
                const formattedData = {
                    name: data.name || '',
                    projectNumber: data.projectNumber || '',
                    active: data.active ?? true,
                    categoryId: data.categoryId || '',
                    startDate: data.startDate ? new Date(data.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                    endDate: data.endDate ? new Date(data.endDate).toISOString().split('T')[0] : '',
                    customerId: data.customerId || ''
                }
                setFormData(formattedData);
                setInitialData(formattedData)
            } else {
                throw new Error('Failed to fetch project')
            }
        } catch (error) {
            console.error('Error fetching project:', error)
            await Swal.fire({
                text: 'Failed to load project data',
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
            router.push('/dashboard/projects')
        } finally {
            setInitialLoading(false)
        }
    }

    // const fetchProjectCategories = async () => {
    //     try {
    //         const res = await fetch('/api/project-categories')
    //         if (res.ok) {
    //             const data = await res.json()
    //             setProjectCategories(data)
    //         }
    //     } catch (error) {
    //         console.error('Error fetching project category:', error)
    //     }
    // }

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

    const handleSubmit = async () => {
        setLoading(true)

        try {
            const res = await fetch(`/api/projects/${resolvedParams.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Failed to update project')
            }

            await Swal.fire({
                text: 'Project updated successfully',
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

            resetChanges();
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

     const handleBack = () => {
        if (window.history.length > 1) {
            router.back()
        } else {
            router.push("/dashboard/projects")
        }
    }

    if (initialLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#31BCFF] mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading project data...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            {/* <Link
                                href="/dashboard/projects"
                                className="p-2 hover:bg-white/50 rounded-lg transition-colors"
                            >
                                <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                            </Link> */}
                            <button onClick={handleBack}>
                                <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
                            </button>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                Edit Project
                            </h1>
                        </div>
                        <p className="mt-2 text-gray-600 ml-14">
                            Update project details and information
                        </p>
                    </div>
                    <div className="hidden md:flex items-center space-x-2">
                        <ProjectFieldSettingsDialog initialSettings={visibleFields} onSettingsSaved={(newSettings) => {
                            setVisibleFields(newSettings)

                        }} onRefresh={refetch} />
                        <div className="w-12 h-12 bg-[#31BCFF]/10 rounded-xl flex items-center justify-center">
                            <svg className="w-6 h-6 text-[#31BCFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form Container */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg p-6">
                {/* Active Checkbox */}
                {hasChanges && (
                    <div className="flex justify-end items-center gap-3">
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Unsaved Changes
                        </Badge>
                    </div>

                )}
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
                <div className="space-y-6">
                    {/* Project Name & Project Number */}
                    <div className="flex flex-wrap gap-6 mt-6">
                        <div className="grow basis-[calc(20%-12px)] min-w-[150px]">
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                                Project Name *
                            </label>
                            <input
                                type="text"
                                id="name"
                                required
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
                                value={formatProjectNumberForDisplay(formData.projectNumber)}
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

                        {/* {settings.showCategory
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
                            </div>} */}

                        {settings.showCustomer
                            && <div className="grow basis-[calc(20%-12px)] min-w-[150px]">
                                <label htmlFor="customerId" className="block text-sm font-medium text-gray-700 mb-2">
                                    Customer
                                </label>
                                <select
                                    id="customerId"
                                    required
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

                        {settings.showStartDate
                            && <div className="grow basis-[calc(20%-12px)] min-w-[150px]">
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

                        {settings.showEndDate
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
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            {loading ? 'Updating...' : 'Update Project'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}