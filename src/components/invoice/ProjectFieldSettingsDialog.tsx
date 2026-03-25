import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import Cog6ToothIcon from '@heroicons/react/24/solid/Cog6ToothIcon'
import Swal from 'sweetalert2'
import { t } from 'i18next'

interface ProjectFieldSettings {
    // showCategory: boolean
    showCustomer: boolean
    showStartDate: boolean
    showEndDate: boolean
}

interface ProjectFieldSettingsDialogProps {
    initialSettings: ProjectFieldSettings
    onSettingsSaved?: (newSettings: ProjectFieldSettings) => void
    onRefresh?: () => void
}

export function ProjectFieldSettingsDialog({
    initialSettings,
    onSettingsSaved,
    onRefresh
}: ProjectFieldSettingsDialogProps) {
    const [settingsOpen, setSettingsOpen] = useState(false)
    const [localSettings, setLocalSettings] = useState<ProjectFieldSettings>(initialSettings)
    const [loading, setLoading] = useState(false)

     useEffect(() => {
        setLocalSettings(initialSettings)
    }, [initialSettings, settingsOpen])

    const handleSaveSettings = async () => {
        setSettingsOpen(false)
        setLoading(true)
        try {
            const res = await fetch('/api/projects/settings', {
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
                        Select which fields you want to display in the project form
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">

                    {/* <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <input
                            type="checkbox"
                            id="showCategory"
                            checked={localSettings.showCategory}
                            onChange={(e) =>
                                setLocalSettings({ ...localSettings, showCategory: e.target.checked })
                            }
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        />
                        <label htmlFor="showCategory" className="text-base font-medium cursor-pointer flex-1">
                            Category
                        </label>
                    </div> */}

                    <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <input
                            type="checkbox"
                            id="showCustomer"
                            checked={localSettings.showCustomer}
                            onChange={(e) =>
                                setLocalSettings({ ...localSettings, showCustomer: e.target.checked })
                            }
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        />
                        <label htmlFor="showCustomer" className="text-base font-medium cursor-pointer flex-1">
                            Customer
                        </label>
                    </div>

                    <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <input
                            type="checkbox"
                            id="showStartDate"
                            checked={localSettings.showStartDate}
                            onChange={(e) =>
                                setLocalSettings({ ...localSettings, showStartDate: e.target.checked })
                            }
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        />
                        <label htmlFor="showStartDate" className="text-base font-medium cursor-pointer flex-1">
                            Start Date
                        </label>
                    </div>

                    <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                        <input
                            type="checkbox"
                            id="showEndDate"
                            checked={localSettings.showEndDate}
                            onChange={(e) =>
                                setLocalSettings({ ...localSettings, showEndDate: e.target.checked })
                            }
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        />
                        <label htmlFor="showEndDate" className="text-base font-medium cursor-pointer flex-1">
                            End Date
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