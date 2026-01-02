import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import Cog6ToothIcon from '@heroicons/react/24/solid/Cog6ToothIcon'
import Swal from 'sweetalert2'
import { t } from 'i18next'

interface CustomerFieldSettings {
    showOrganizationNumber: boolean;
    showAddress: boolean;
    showPostalCode: boolean;
    showPostalAddress: boolean;
    showPhoneNumber: boolean;
    showEmail: boolean;
    showDiscountPercentage: boolean;
    showDeliveryAddress: boolean;
    showDeliveryAddressPostalCode: boolean;
    showDeliveryAddressPostalAddress: boolean;
    showDepartment: boolean;
    showInvoicePaymentTerms: boolean;
    showContactPerson: boolean;
}

interface CustomerFieldSettingsDialogProps {
    initialSettings: CustomerFieldSettings
    onSettingsSaved?: (newSettings: CustomerFieldSettings) => void
    onRefresh?: () => void
}

export function CustomerFieldSettingsDialog({
    initialSettings,
    onSettingsSaved,
    onRefresh
}: CustomerFieldSettingsDialogProps) {
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    // Local state for editing - independent from parent
    const [localSettings, setLocalSettings] = useState<CustomerFieldSettings>(initialSettings)

    // Sync local state when dialog opens or initial settings change
    useEffect(() => {
        setLocalSettings(initialSettings)
    }, [initialSettings, settingsOpen])

    const handleSaveSettings = async () => {

        setSettingsOpen(false)
        setLoading(true)
        try {
            const res = await fetch('/api/customers/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(localSettings),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || 'Failed to save the settings')
            }
            Swal.fire({
                title: t('common.success'),
                text: 'Settings saved successfully',
                icon: 'success',
                confirmButtonColor: '#31BCFF',
            })
            // Notify parent with the new settings
            onSettingsSaved?.(localSettings)
            onRefresh?.()

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

    return (<Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogTrigger asChild>
            <button className="inline-flex items-center justify-center px-4 py-3 rounded-2xl bg-white text-gray-700 font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 border border-gray-200">
                <Cog6ToothIcon className="w-5 h-5 mr-2" />
                Options
            </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle className="text-2xl font-bold">Invoice Field Options</DialogTitle>
                <DialogDescription>
                    Select which fields you want to display in the project form
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">

                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                        type="checkbox"
                        id="showOrganizationNumber"
                        checked={localSettings.showOrganizationNumber}
                        onChange={(e) =>
                            setLocalSettings({ ...localSettings, showOrganizationNumber: e.target.checked })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="showOrganizationNumber" className="text-base font-medium cursor-pointer flex-1">
                        Organization Number
                    </label>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                        type="checkbox"
                        id="showAddress"
                        checked={localSettings.showAddress}
                        onChange={(e) =>
                            setLocalSettings({ ...localSettings, showAddress: e.target.checked })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="showAddress" className="text-base font-medium cursor-pointer flex-1">
                        Address
                    </label>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                        type="checkbox"
                        id="showPostalCode"
                        checked={localSettings.showPostalCode}
                        onChange={(e) =>
                            setLocalSettings({ ...localSettings, showPostalCode: e.target.checked })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="showPostalCode" className="text-base font-medium cursor-pointer flex-1">
                        Postal Code
                    </label>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                        type="checkbox"
                        id="showPostalAddress"
                        checked={localSettings.showPostalAddress}
                        onChange={(e) =>
                            setLocalSettings({ ...localSettings, showPostalAddress: e.target.checked })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="showPostalAddress" className="text-base font-medium cursor-pointer flex-1">
                        Postal Address
                    </label>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                        type="checkbox"
                        id="showPhoneNumber"
                        checked={localSettings.showPhoneNumber}
                        onChange={(e) =>
                            setLocalSettings({ ...localSettings, showPhoneNumber: e.target.checked })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="showPhoneNumber" className="text-base font-medium cursor-pointer flex-1">
                        Phone Number
                    </label>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                        type="checkbox"
                        id="showEmail"
                        checked={localSettings.showEmail}
                        onChange={(e) =>
                            setLocalSettings({ ...localSettings, showEmail: e.target.checked })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="showEmail" className="text-base font-medium cursor-pointer flex-1">
                        Email
                    </label>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                        type="checkbox"
                        id="showDiscountPercentage"
                        checked={localSettings.showDiscountPercentage}
                        onChange={(e) =>
                            setLocalSettings({ ...localSettings, showDiscountPercentage: e.target.checked })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="showDiscountPercentage" className="text-base font-medium cursor-pointer flex-1">
                        Discount Percentage
                    </label>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                        type="checkbox"
                        id="showDeliveryAddress"
                        checked={localSettings.showDeliveryAddress}
                        onChange={(e) =>
                            setLocalSettings({ ...localSettings, showDeliveryAddress: e.target.checked })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="showDeliveryAddress" className="text-base font-medium cursor-pointer flex-1">
                        Delivery Address
                    </label>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                        type="checkbox"
                        id="showDeliveryAddressPostalCode"
                        checked={localSettings.showDeliveryAddressPostalCode}
                        onChange={(e) =>
                            setLocalSettings({ ...localSettings, showDeliveryAddressPostalCode: e.target.checked })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="showDeliveryAddressPostalCode" className="text-base font-medium cursor-pointer flex-1">
                        Delivery Address Postal Code
                    </label>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                        type="checkbox"
                        id="showDeliveryAddressPostalAddress"
                        checked={localSettings.showDeliveryAddressPostalAddress}
                        onChange={(e) =>
                            setLocalSettings({ ...localSettings, showDeliveryAddressPostalAddress: e.target.checked })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="showDeliveryAddressPostalAddress" className="text-base font-medium cursor-pointer flex-1">
                        Delivery Address Postal Address
                    </label>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                        type="checkbox"
                        id="showDepartment"
                        checked={localSettings.showDepartment}
                        onChange={(e) =>
                            setLocalSettings({ ...localSettings, showDepartment: e.target.checked })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="showDepartment" className="text-base font-medium cursor-pointer flex-1">
                        Department
                    </label>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                        type="checkbox"
                        id="showInvoicePaymentTerms"
                        checked={localSettings.showInvoicePaymentTerms}
                        onChange={(e) =>
                            setLocalSettings({ ...localSettings, showInvoicePaymentTerms: e.target.checked })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="showInvoicePaymentTerms" className="text-base font-medium cursor-pointer flex-1">
                        Invoice Payment Terms
                    </label>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                        type="checkbox"
                        id="showContactPerson"
                        checked={localSettings.showContactPerson}
                        onChange={(e) =>
                            setLocalSettings({ ...localSettings, showContactPerson: e.target.checked })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="showContactPerson" className="text-base font-medium cursor-pointer flex-1">
                        Contact Person
                    </label>
                </div>

            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
                <Button variant="outline" onClick={() => setSettingsOpen(false)}>
                    Cancel
                </Button>
                <Button onClick={handleSaveSettings} className="bg-[#31BCFF] hover:bg-[#0EA5E9] text-white">
                    Save Settings
                </Button>
            </div>
        </DialogContent>
    </Dialog>
    );
}