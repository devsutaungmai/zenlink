'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Save, Loader2, FileText, Users, CreditCard } from 'lucide-react'
import Swal from 'sweetalert2'

export interface GeneralSetting {
  firstInvoiceNumber: number
  firstCreditNoteNumber: number
  customerNumberSeriesStart: number | null
  customerNumberSeriesEnd: number | null
  defaultBankAccount: string
  defaultPaymentTermsDays: number
  defaultDueDays: number
}

export default function GeneralSetting() {
  const [hasChanges, setHasChanges] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState<GeneralSetting>({
    firstInvoiceNumber: 1,
    firstCreditNoteNumber: 1,
    customerNumberSeriesStart: 1000,
    customerNumberSeriesEnd: 19999,
    defaultBankAccount: '',
    defaultPaymentTermsDays: 30,
    defaultDueDays: 30
  })
  const [originalData, setOriginalData] = useState<GeneralSetting>(formData)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/invoice-general-settings')
      
      if (response.ok) {
        const data = await response.json()
        if (data.settings) {
          const settings = {
            firstInvoiceNumber: data.settings.firstInvoiceNumber || 1,
            firstCreditNoteNumber: data.settings.firstCreditNoteNumber || 1,
            customerNumberSeriesStart: data.settings.customerNumberSeriesStart || 10000,
            customerNumberSeriesEnd: data.settings.customerNumberSeriesEnd || 19999,
            defaultBankAccount: data.settings.defaultBankAccount || '',
            defaultPaymentTermsDays: data.settings.defaultPaymentTermsDays || 30,
            defaultDueDays: data.settings.defaultDueDays || 30
          }
          setFormData(settings)
          setOriginalData(settings)
        }
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof GeneralSetting, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }
      setHasChanges(JSON.stringify(updated) !== JSON.stringify(originalData))
      return updated
    })
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)

      // Validation
      if (formData.customerNumberSeriesStart && formData.customerNumberSeriesEnd) {
        if (formData.customerNumberSeriesStart >= formData.customerNumberSeriesEnd) {
          Swal.fire({
            icon: 'error',
            title: 'Validation Error',
            text: 'Customer number series start must be less than end',
          })
          return
        }
      }
      
      const response = await fetch('/api/invoice-general-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save settings')
      }

      const data = await response.json()
      setOriginalData(formData)
      setHasChanges(false)

      Swal.fire({
        text: 'Settings saved successfully!',
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
    } catch (error: any) {
      console.error('Error saving settings:', error)
      Swal.fire({
        text: `Error: ${error.message || 'Failed to save settings'}`,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        icon: 'error',
        customClass: {
          popup: 'swal-toast-wide'
        }
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#31BCFF]" />
        <span className="ml-2 text-gray-600">Loading settings...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Invoice General Settings</h2>
          <p className="text-gray-600 mt-1">Configure invoice numbering and default values</p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Badge variant="secondary" className="bg-amber-100 text-amber-800">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Unsaved Changes
            </Badge>
          )}
        </div>
      </div>

      {/* Invoice Numbering Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Invoice Numbering
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="firstInvoiceNumber">First Invoice Number</Label>
              <Input
                id="firstInvoiceNumber"
                type="number"
                min="1"
                value={formData.firstInvoiceNumber}
                onChange={(e) => handleInputChange('firstInvoiceNumber', parseInt(e.target.value) || 1)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                The starting number for your invoices. Format:{formData.firstInvoiceNumber}
              </p>
            </div>

            <div>
              <Label htmlFor="firstCreditNoteNumber">First Credit Note Number</Label>
              <Input
                id="firstCreditNoteNumber"
                type="number"
                min="1"
                value={formData.firstCreditNoteNumber}
                onChange={(e) => handleInputChange('firstCreditNoteNumber', parseInt(e.target.value) || 1)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                The starting number for credit notes. Format: CN-{formData.firstCreditNoteNumber.toString().padStart(4, '0')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer Number Series */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Customer Number Series
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="customerNumberSeriesStart">Series Start</Label>
              <Input
                id="customerNumberSeriesStart"
                type="number"
                min="10000"
                placeholder="e.g., 10000"
                value={formData.customerNumberSeriesStart || ''}
                disabled
                onChange={(e) => handleInputChange('customerNumberSeriesStart', e.target.value ? parseInt(e.target.value) : null)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Starting number for customer IDs (leave empty to use default)
              </p>
            </div>

            <div>
              <Label htmlFor="customerNumberSeriesEnd">Series End</Label>
              <Input
                id="customerNumberSeriesEnd"
                type="number"
                min="19999"
                placeholder="e.g., 19999"
                disabled
                value={formData.customerNumberSeriesEnd || ''}
                onChange={(e) => handleInputChange('customerNumberSeriesEnd', e.target.value ? parseInt(e.target.value) : null)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ending number for customer IDs (must be greater than start)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment & Bank Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Payment & Bank Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="defaultBankAccount">Default Bank Account</Label>
              <Input
                id="defaultBankAccount"
                type="text"
                placeholder="e.g., 1234-56-78900"
                value={formData.defaultBankAccount}
                onChange={(e) => handleInputChange('defaultBankAccount', e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your default bank account number for invoices
              </p>
            </div>

            <div>
              <Label htmlFor="defaultPaymentTermsDays">Default Payment Terms (Days)</Label>
              <Input
                id="defaultPaymentTermsDays"
                type="number"
                min="0"
                value={formData.defaultPaymentTermsDays}
                onChange={(e) => handleInputChange('defaultPaymentTermsDays', parseInt(e.target.value) || 0)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Default payment terms for new invoices
              </p>
            </div>

            <div>
              <Label htmlFor="defaultDueDays">Default Due Days</Label>
              <Input
                id="defaultDueDays"
                type="number"
                min="0"
                value={formData.defaultDueDays}
                onChange={(e) => handleInputChange('defaultDueDays', parseInt(e.target.value) || 0)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Default number of days until invoice is due
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-end">
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="flex items-center gap-2 bg-[#31BCFF] hover:bg-[#31BCFF]/90"
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isSaving ? 'Saving...' : "Save Changes"}
        </Button>
      </div>
    </div>
  )
}