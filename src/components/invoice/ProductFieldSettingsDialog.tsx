import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import Cog6ToothIcon from '@heroicons/react/24/solid/Cog6ToothIcon'
import Swal from 'sweetalert2'

interface ProductFieldSettings {
  showSalesPrice: boolean
  showCostPrice: boolean
  showDiscountPercentage: boolean
  showUnit: boolean
  showProductGroup: boolean
}

interface ProductFieldSettingsDialogProps {
  initialSettings: ProductFieldSettings
  onSettingsSaved?: (newSettings: ProductFieldSettings) => void
  onRefresh?: () => void
}

export function ProductFieldSettingsDialog({ 
  initialSettings, 
  onSettingsSaved, 
  onRefresh
}: ProductFieldSettingsDialogProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  // Local state for editing - independent from parent
  const [localSettings, setLocalSettings] = useState<ProductFieldSettings>(initialSettings)

  // Sync local state when dialog opens or initial settings change
  useEffect(() => {
    setLocalSettings(initialSettings)
  }, [initialSettings, settingsOpen])

  const handleSaveSettings = async () => {
    setLoading(true)
    
    try {
      const res = await fetch('/api/products/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localSettings),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to save the settings')
      }
      
      // Close dialog first
      setSettingsOpen(false)
      
      await Swal.fire({
        title: 'Success',
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

  const handleCancel = () => {
    // Reset to initial settings when canceling
    setLocalSettings(initialSettings)
    setSettingsOpen(false)
  }

  return (
    <Dialog open={settingsOpen} onOpenChange={(open) => {
      if (!open) handleCancel()
      else setSettingsOpen(open)
    }}>
      <DialogTrigger asChild>
        <button 
          className="inline-flex items-center justify-center px-4 py-3 rounded-2xl bg-white text-gray-700 font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 border border-gray-200"
          disabled={loading}
        >
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
              id="showSalesPrice"
              checked={localSettings.showSalesPrice}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, showSalesPrice: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="showSalesPrice" className="text-base font-medium cursor-pointer flex-1">
              Sales Price
            </label>
          </div>

          <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              id="showCostPrice"
              checked={localSettings.showCostPrice}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, showCostPrice: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="showCostPrice" className="text-base font-medium cursor-pointer flex-1">
              Cost Price
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
              id="showUnit"
              checked={localSettings.showUnit}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, showUnit: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="showUnit" className="text-base font-medium cursor-pointer flex-1">
              Unit
            </label>
          </div>

          <div className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <input
              type="checkbox"
              id="showProductGroup"
              checked={localSettings.showProductGroup}
              onChange={(e) =>
                setLocalSettings({ ...localSettings, showProductGroup: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
            />
            <label htmlFor="showProductGroup" className="text-base font-medium cursor-pointer flex-1">
              Product Group
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSaveSettings} 
            className="bg-[#31BCFF] hover:bg-[#0EA5E9] text-white"
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}