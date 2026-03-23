import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import Cog6ToothIcon from '@heroicons/react/24/solid/Cog6ToothIcon'
import Swal from 'sweetalert2'
import { t } from 'i18next'

interface InvoiceFieldSettings {
    showDiscount: boolean
    showPaymentTerms: boolean
    showDepartment: boolean
    showContactPerson: boolean
    showDeliveryAddress: boolean
    showProject: boolean
    showNote: boolean
}

interface InvoiceFieldSettingsDialogProps {
    initialSettings: InvoiceFieldSettings
    onSettingsSaved?: (newSettings: InvoiceFieldSettings) => void
    onRefresh?: () => void
}

export function InvoiceFieldSettingsDialog({
    initialSettings,
    onSettingsSaved,
    onRefresh
}: InvoiceFieldSettingsDialogProps) {
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [localSettings, setLocalSettings] = useState<InvoiceFieldSettings>(initialSettings)
    const [loading, setLoading] = useState(false)
    // Sync local state when dialog opens or initial settings change
    useEffect(() => {
        setLocalSettings(initialSettings)
    }, [initialSettings, settingsOpen])

    const handleSaveSettings = async () => {

        setSettingsOpen(false)
        setLoading(true)
        try {
            const res = await fetch('/api/invoices/settings', {
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

    return (
    <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
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
                    Select which fields you want to display in the invoice form
                </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">

                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                        type="checkbox"
                        id="showDiscount"
                        checked={localSettings.showDiscount}
                        onChange={(e) =>
                            setLocalSettings({ ...localSettings, showDiscount: e.target.checked })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="showDiscount" className="text-base font-medium cursor-pointer flex-1">
                        Discount
                    </label>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                        type="checkbox"
                        id="showPaymentTerms"
                        checked={localSettings.showPaymentTerms}
                        onChange={(e) =>
                            setLocalSettings({ ...localSettings, showPaymentTerms: e.target.checked })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="showPaymentTerms" className="text-base font-medium cursor-pointer flex-1">
                        Payment Terms
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

                {/* <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                        type="checkbox"
                        id="showSeller"
                        checked={localSettings.showSeller}
                        onChange={(e) =>
                            setLocalSettings({ ...localSettings, showSeller: e.target.checked })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="showSeller" className="text-base font-medium cursor-pointer flex-1">
                        Seller
                    </label>
                </div> */}

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

                <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <input
                        type="checkbox"
                        id="showProject"
                        checked={localSettings.showProject}
                        onChange={(e) =>
                            setLocalSettings({ ...localSettings, showProject: e.target.checked })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="showProject" className="text-base font-medium cursor-pointer flex-1">
                        Project
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
                        id="showDeliveryAddress"
                        checked={localSettings.showNote}
                        onChange={(e) =>
                            setLocalSettings({ ...localSettings, showNote: e.target.checked })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    />
                    <label htmlFor="showDeliveryAddress" className="text-base font-medium cursor-pointer flex-1">
                        Additional Note
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
    </Dialog>)

}