'use client'

import { useEffect, useState } from 'react'
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

interface CustomerContactProps {
    oncustomerContactsChange?: (customerContacts: CustomerContact[]) => void
    defaultValues?: CustomerContact[]
}

export interface CustomerContact {
    name: string
    phoneNumber: string
    email: string,
    isPrimary: boolean
}

export default function CustomerContactComponent({
    oncustomerContactsChange,
    defaultValues,
}: CustomerContactProps) {
    const [isExpanded, setIsExpanded] = useState(true)
    const [customerContacts, setCustomerContacts] = useState<CustomerContact[]>([])

    useEffect(() => {
        if (defaultValues) {
            setCustomerContacts(defaultValues || []);
        }
    }, [defaultValues])

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
    }

    const CopyContact = (contact: CustomerContact) => {
        const newContact = {
            name: contact.name,
            phoneNumber: contact.phoneNumber,
            email: contact.email,
            isPrimary: contact.isPrimary,
        };
        const upudatedContacts = [...(customerContacts || []), newContact];
        setCustomerContacts(upudatedContacts);
        oncustomerContactsChange?.(upudatedContacts);
    }

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
            {/* Header */}
            <button
                onClick={(e) => { e.preventDefault(); setIsExpanded(!isExpanded) }}
                className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
            >
                <h2 className="text-lg font-semibold text-gray-900">Customer Contact</h2>
                {isExpanded ? (
                    <ChevronUpIcon className="w-5 h-5 text-[#31BCFF]" />
                ) : (
                    <ChevronDownIcon className="w-5 h-5 text-gray-600" />
                )}
            </button>

            {/* Content */}
            {isExpanded && (
                <div className="px-6 py-6 bg-white/50 border-t border-gray-200 ">
                    <div className="flex justify-end mb-4">
                        <button
                            type="button"
                            onClick={handleNewContact}
                            className="inline-flex items-center px-4 py-2 bg-[#31BCFF] text-white rounded-md hover:bg-[#28AEE6] focus:outline-none"
                        >
                            Add New Contact
                        </button>
                    </div>
                    {customerContacts && customerContacts.length > 0 &&
                        customerContacts.map((contact, index) => (
                            <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Name
                                    </label>
                                    <input
                                        type="text"
                                        value={contact.name}
                                        onChange={(e) => {
                                            const updatedContacts = [...customerContacts];
                                            updatedContacts[index].name = e.target.value;
                                            setCustomerContacts(updatedContacts);
                                            oncustomerContactsChange?.(updatedContacts);
                                        }}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Phone Number
                                    </label>
                                    <input
                                        type="text"
                                        value={contact.phoneNumber}
                                        onChange={(e) => {
                                            const updatedContacts = [...customerContacts];
                                            updatedContacts[index].phoneNumber = e.target.value;
                                            setCustomerContacts(updatedContacts);
                                            oncustomerContactsChange?.(updatedContacts);
                                        }}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={contact.email}
                                        onChange={(e) => {
                                            const updatedContacts = [...customerContacts];
                                            updatedContacts[index].email = e.target.value;
                                            setCustomerContacts(updatedContacts);
                                            oncustomerContactsChange?.(updatedContacts);
                                        }}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Primary Contact
                                    </label>
                                    <input
                                        type="checkbox"
                                        checked={contact.isPrimary}
                                        onChange={(e) => {
                                            const updatedContacts = [...customerContacts];
                                            updatedContacts[index].isPrimary = e.target.checked;
                                            setCustomerContacts(updatedContacts);
                                            oncustomerContactsChange?.(updatedContacts);
                                        }}
                                        className="mt-2 h-4 w-4 text-[#31BCFF] border-gray-300 rounded"
                                    />
                                </div>
                                <div className='items-end flex space-x-4 mb-3'>
                                    <button
                                        type='button'
                                        onClick={() => deleteContact(index)}
                                    >
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>

                                    </button>
                                    <button
                                        type='button'
                                        onClick={() => CopyContact(contact)}
                                    >
                                        <svg className="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2h-6a2 2 0 01-2-2V7z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H7a2 2 0 00-2 2v7a2 2 0 002 2h7a2 2 0 002-2v-1" />
                                        </svg>

                                    </button>

                                </div>
                            </div>
                        ))
                    }
                </div>
            )}
        </div>
    )
}
