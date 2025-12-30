'use client'

import { useEffect, useState } from 'react'
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { z } from 'zod'

interface CustomerContactProps {
    oncustomerContactsChange?: (customerContacts: CustomerContact[]) => void
    defaultValues?: CustomerContact[]
    overviewMode?: boolean
}

export interface CustomerContact {
    name: string
    phoneNumber: string
    email: string,
    isPrimary: boolean
}

// Individual contact field validation schema
const contactFieldSchema = {
    name: z.string()
        .min(1, 'Name is required')
        .min(2, 'Name must be at least 2 characters')
        .max(100, 'Name must be less than 100 characters'),
    phoneNumber: z.string()
        .min(1, 'Phone number is required')
        .max(20, 'Phone number must be less than 20 characters')
        .regex(/^[0-9\s+()-]*$/, 'Phone number can only contain numbers and phone symbols'),
    email: z.string()
        .min(1, 'Email is required')
        .email('Invalid email format')
}

export default function CustomerContactComponent({
    oncustomerContactsChange,
    defaultValues,
    overviewMode
}: CustomerContactProps) {
    const [isExpanded, setIsExpanded] = useState(true)
    const [customerContacts, setCustomerContacts] = useState<CustomerContact[]>([])
    const [validationErrors, setValidationErrors] = useState<Record<string, Record<string, string>>>({})
    const [touched, setTouched] = useState<Record<string, Record<string, boolean>>>({})

    useEffect(() => {
        if (defaultValues) {
            setCustomerContacts(defaultValues || []);
        }
    }, [defaultValues])

    const validateField = (index: number, fieldName: keyof typeof contactFieldSchema, value: any) => {
        try {
            contactFieldSchema[fieldName].parse(value)
            setValidationErrors(prev => ({
                ...prev,
                [index]: {
                    ...prev[index],
                    [fieldName]: ''
                }
            }))
        } catch (error) {
            if (error instanceof z.ZodError && error.issues.length > 0) {
                setValidationErrors(prev => ({
                    ...prev,
                    [index]: {
                        ...prev[index],
                        [fieldName]: error.issues[0].message
                    }
                }))
            }
        }
    }

    const handleFieldBlur = (index: number, fieldName: string) => {
        setTouched(prev => ({
            ...prev,
            [index]: {
                ...prev[index],
                [fieldName]: true
            }
        }))
    }

    const handleNewContact = () => {
        const newContact = {
            name: '',
            phoneNumber: '',
            email: '',
            isPrimary: false,
        };
        const updatedContacts = [...(customerContacts || []), newContact];
        setCustomerContacts(updatedContacts);
        oncustomerContactsChange?.(updatedContacts);
    }

    const deleteContact = (index: number) => {
        const updatedContacts = customerContacts?.filter((_, i) => i !== index) || [];
        setCustomerContacts(updatedContacts);
        oncustomerContactsChange?.(updatedContacts);
        
        // Clean up validation errors and touched state for deleted contact
        const newValidationErrors = { ...validationErrors };
        const newTouched = { ...touched };
        delete newValidationErrors[index];
        delete newTouched[index];
        setValidationErrors(newValidationErrors);
        setTouched(newTouched);
    }

    const CopyContact = (contact: CustomerContact) => {
        const newContact = {
            name: contact.name,
            phoneNumber: contact.phoneNumber,
            email: contact.email,
            isPrimary: contact.isPrimary,
        };
        const updatedContacts = [...(customerContacts || []), newContact];
        setCustomerContacts(updatedContacts);
        oncustomerContactsChange?.(updatedContacts);
    }

    const hasPrimaryContact = customerContacts.some(contact => contact.isPrimary)

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
            {/* Header */}
            <button
                onClick={(e) => { e.preventDefault(); setIsExpanded(!isExpanded) }}
                className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-gray-900">Customer Contact *</h2>
                    {customerContacts.length === 0 && (
                        <span className="text-xs text-red-600 font-normal">(Required)</span>
                    )}
                    {customerContacts.length > 0 && !hasPrimaryContact && (
                        <span className="text-xs text-amber-600 font-normal">(No primary contact)</span>
                    )}
                </div>
                {isExpanded ? (
                    <ChevronUpIcon className="w-5 h-5 text-[#31BCFF]" />
                ) : (
                    <ChevronDownIcon className="w-5 h-5 text-gray-600" />
                )}
            </button>

            {/* Content */}
            {isExpanded && (
                <div className="px-6 py-6 bg-white/50 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-sm text-gray-600">
                            {customerContacts.length === 0 
                                ? 'Add at least one contact person. One contact must be marked as primary.'
                                : `${customerContacts.length} contact${customerContacts.length > 1 ? 's' : ''} added`
                            }
                        </p>
                        {!overviewMode && <button
                            type="button"
                            onClick={handleNewContact}
                            className="inline-flex items-center px-4 py-2 bg-[#31BCFF] text-white rounded-md hover:bg-[#28AEE6] focus:outline-none transition-colors"
                        >
                            Add New Contact
                        </button>}
                    </div>

                    {customerContacts && customerContacts.length > 0 &&
                        customerContacts.map((contact, index) => (
                            <div key={index} className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={contact.name}
                                            onChange={(e) => {
                                                const updatedContacts = [...customerContacts];
                                                updatedContacts[index].name = e.target.value;
                                                setCustomerContacts(updatedContacts);
                                                oncustomerContactsChange?.(updatedContacts);
                                                if (touched[index]?.name) {
                                                    validateField(index, 'name', e.target.value);
                                                }
                                            }}
                                            onBlur={(e) => {
                                                handleFieldBlur(index, 'name');
                                                validateField(index, 'name', e.target.value);
                                            }}
                                            className={`mt-1 block w-full border ${
                                                touched[index]?.name && validationErrors[index]?.name 
                                                    ? 'border-red-500' 
                                                    : 'border-gray-300'
                                            } rounded-md shadow-sm p-2 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF]`}
                                            placeholder="Contact name"
                                        />
                                        {touched[index]?.name && validationErrors[index]?.name && (
                                            <p className="mt-1 text-xs text-red-600">{validationErrors[index].name}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Phone Number *
                                        </label>
                                        <input
                                            type="text"
                                            value={contact.phoneNumber}
                                            onChange={(e) => {
                                                const updatedContacts = [...customerContacts];
                                                updatedContacts[index].phoneNumber = e.target.value;
                                                setCustomerContacts(updatedContacts);
                                                oncustomerContactsChange?.(updatedContacts);
                                                if (touched[index]?.phoneNumber) {
                                                    validateField(index, 'phoneNumber', e.target.value);
                                                }
                                            }}
                                            onBlur={(e) => {
                                                handleFieldBlur(index, 'phoneNumber');
                                                validateField(index, 'phoneNumber', e.target.value);
                                            }}
                                            className={`mt-1 block w-full border ${
                                                touched[index]?.phoneNumber && validationErrors[index]?.phoneNumber 
                                                    ? 'border-red-500' 
                                                    : 'border-gray-300'
                                            } rounded-md shadow-sm p-2 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF]`}
                                            placeholder="+1 234 567 8900"
                                        />
                                        {touched[index]?.phoneNumber && validationErrors[index]?.phoneNumber && (
                                            <p className="mt-1 text-xs text-red-600">{validationErrors[index].phoneNumber}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Email *
                                        </label>
                                        <input
                                            type="email"
                                            value={contact.email}
                                            onChange={(e) => {
                                                const updatedContacts = [...customerContacts];
                                                updatedContacts[index].email = e.target.value;
                                                setCustomerContacts(updatedContacts);
                                                oncustomerContactsChange?.(updatedContacts);
                                                if (touched[index]?.email) {
                                                    validateField(index, 'email', e.target.value);
                                                }
                                            }}
                                            onBlur={(e) => {
                                                handleFieldBlur(index, 'email');
                                                validateField(index, 'email', e.target.value);
                                            }}
                                            className={`mt-1 block w-full border ${
                                                touched[index]?.email && validationErrors[index]?.email 
                                                    ? 'border-red-500' 
                                                    : 'border-gray-300'
                                            } rounded-md shadow-sm p-2 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF]`}
                                            placeholder="email@example.com"
                                        />
                                        {touched[index]?.email && validationErrors[index]?.email && (
                                            <p className="mt-1 text-xs text-red-600">{validationErrors[index].email}</p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Primary Contact
                                        </label>
                                        <div className="flex items-center mt-3">
                                            <input
                                                type="checkbox"
                                                checked={contact.isPrimary}
                                                onChange={(e) => {
                                                    const updatedContacts = [...customerContacts];
                                                    // If setting this as primary, unset others
                                                    if (e.target.checked) {
                                                        updatedContacts.forEach((c, i) => {
                                                            if (i !== index) c.isPrimary = false;
                                                        });
                                                    }
                                                    updatedContacts[index].isPrimary = e.target.checked;
                                                    setCustomerContacts(updatedContacts);
                                                    oncustomerContactsChange?.(updatedContacts);
                                                }}
                                                className="h-4 w-4 text-[#31BCFF] border-gray-300 rounded focus:ring-[#31BCFF]"
                                            />
                                            <span className="ml-2 text-sm text-gray-600">
                                                {contact.isPrimary && '✓ Primary'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                               {!overviewMode && <div className='flex justify-end space-x-2'>
                                    <button
                                        type='button'
                                        onClick={() => CopyContact(contact)}
                                        className="inline-flex items-center px-3 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                                        title="Duplicate contact"
                                    >
                                        <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2h-6a2 2 0 01-2-2V7z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H7a2 2 0 00-2 2v7a2 2 0 002 2h7a2 2 0 002-2v-1" />
                                        </svg>
                                        Copy
                                    </button>
                                    <button
                                        type='button'
                                        onClick={() => deleteContact(index)}
                                        className="inline-flex items-center px-3 py-1.5 text-sm text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors"
                                        title="Delete contact"
                                    >
                                        <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        Delete
                                    </button>
                                </div>}
                            </div>
                        ))
                    }

                    {customerContacts.length === 0 && (
                        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                            <p className="text-gray-500 mb-2">No contacts added yet</p>
                            <p className="text-sm text-gray-400">Click "Add New Contact" to get started</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}