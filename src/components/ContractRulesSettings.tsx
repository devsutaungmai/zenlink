'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { MultiSelect } from '@/components/ui/multi-select'
import { 
  Plus, 
  Pencil, 
  Trash2, 
  FileText, 
  Clock, 
  Users, 
  Save,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from 'lucide-react'
import Swal from 'sweetalert2'
import { useTranslation } from 'react-i18next'

interface LaborLawProfile {
  id: string
  name: string
  description: string | null
  isDefault: boolean
  laborLawSettingsId: string | null
  laborLawSettings?: {
    id: string
    countryCode: string
    maxHoursPerDay: number
    maxHoursPerWeek: number
  } | null
  _count?: {
    contractTypes: number
  }
}

interface ContractType {
  id: string
  name: string
  employmentType: 'FULL_TIME' | 'PART_TIME' | 'SEASONAL_TEMPORARY' | 'HOURLY' | 'MONTHLY_SALARY'
  defaultFtePercent: number
  agreedWeeklyHours: number | null
  maxPlannedWeeklyHours: number | null
  overtimeAllowed: boolean
  overtimeExemptRoleIds: string[]
  maxWeekendsPerMonth: number | null
  customBreakMinutes: number | null
  warningType: 'YELLOW_IN_PLANNER' | 'EMAIL_NOTIFICATION' | 'BLOCK_SCHEDULING'
  notifyManagerOnDeviation: boolean
  allowSchedulingWithDeviation: boolean
  laborLawProfileId: string
  laborLawProfile?: LaborLawProfile
  _count?: {
    employees: number
  }
  updatedAt: string
}

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'Full-Time',
  PART_TIME: 'Part-Time',
  SEASONAL_TEMPORARY: 'Seasonal/Temporary',
  HOURLY: 'Hourly',
  MONTHLY_SALARY: 'Monthly Salary',
}


interface Role {
  id: string
  name: string
  isSystem?: boolean
}

export default function ContractRulesSettings() {
  const { t } = useTranslation('settings')
  const [contractTypes, setContractTypes] = useState<ContractType[]>([])
  const [laborLawProfiles, setLaborLawProfiles] = useState<LaborLawProfile[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([])

  const [formData, setFormData] = useState<Partial<ContractType>>({
    name: '',
    employmentType: 'FULL_TIME',
    defaultFtePercent: 100,
    agreedWeeklyHours: null,
    maxPlannedWeeklyHours: null,
    overtimeAllowed: true,
    overtimeExemptRoleIds: [],
    maxWeekendsPerMonth: null,
    customBreakMinutes: null,
    laborLawProfileId: '',
  })

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [typesRes, profilesRes, rolesRes] = await Promise.all([
        fetch('/api/contract-types?includeProfile=true&includeEmployeeCount=true'),
        fetch('/api/labor-law-profiles?includeSettings=true'),
        fetch('/api/roles'),
      ])

      if (typesRes.ok) {
        const data = await typesRes.json()
        setContractTypes(data.contractTypes || [])
      }

      if (profilesRes.ok) {
        const data = await profilesRes.json()
        setLaborLawProfiles(data.profiles || [])
      }

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json()
        setRoles(rolesData || [])
      }
    } catch (error) {
      console.error('Error fetching contract rules data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const resetForm = () => {
    setFormData({
      name: '',
      employmentType: 'FULL_TIME',
      defaultFtePercent: 100,
      agreedWeeklyHours: null,
      maxPlannedWeeklyHours: null,
      overtimeAllowed: true,
      overtimeExemptRoleIds: [],
      maxWeekendsPerMonth: null,
      customBreakMinutes: null,
      laborLawProfileId: laborLawProfiles[0]?.id || '',
    })
    setSelectedRoleIds([])
  }

  const handleCreate = () => {
    resetForm()
    setFormData(prev => ({
      ...prev,
      laborLawProfileId: laborLawProfiles.find(p => p.isDefault)?.id || laborLawProfiles[0]?.id || '',
    }))
    setIsCreating(true)
    setEditingId(null)
  }

  const handleEdit = (contractType: ContractType) => {
    setFormData({
      name: contractType.name,
      employmentType: contractType.employmentType,
      defaultFtePercent: contractType.defaultFtePercent,
      agreedWeeklyHours: contractType.agreedWeeklyHours,
      maxPlannedWeeklyHours: contractType.maxPlannedWeeklyHours,
      overtimeAllowed: contractType.overtimeAllowed,
      overtimeExemptRoleIds: contractType.overtimeExemptRoleIds,
      maxWeekendsPerMonth: contractType.maxWeekendsPerMonth,
      customBreakMinutes: contractType.customBreakMinutes,
      laborLawProfileId: contractType.laborLawProfileId,
    })
    setSelectedRoleIds(contractType.overtimeExemptRoleIds || [])
    setEditingId(contractType.id)
    setIsCreating(false)
  }

  const handleCancel = () => {
    setEditingId(null)
    setIsCreating(false)
    resetForm()
  }

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Contract type name is required',
      })
      return
    }

    if (!formData.laborLawProfileId) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Labor law profile is required',
      })
      return
    }

    try {
      setIsSaving(true)
      const url = editingId 
        ? `/api/contract-types/${editingId}`
        : '/api/contract-types'
      
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          overtimeExemptRoleIds: selectedRoleIds,
        }),
      })

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: editingId ? 'Updated' : 'Created',
          text: `Contract type ${editingId ? 'updated' : 'created'} successfully`,
          timer: 1500,
          showConfirmButton: false,
        })
        handleCancel()
        fetchData()
      } else {
        const error = await response.json()
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.error || 'Failed to save contract type',
        })
      }
    } catch (error) {
      console.error('Error saving contract type:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to save contract type',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (contractType: ContractType) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Delete Contract Type',
      text: `Are you sure you want to delete "${contractType.name}"?`,
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Delete',
    })

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/contract-types/${contractType.id}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          Swal.fire({
            icon: 'success',
            title: 'Deleted',
            text: 'Contract type deleted successfully',
            timer: 1500,
            showConfirmButton: false,
          })
          fetchData()
        } else {
          const error = await response.json()
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.error || 'Failed to delete contract type',
          })
        }
      } catch (error) {
        console.error('Error deleting contract type:', error)
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to delete contract type',
        })
      }
    }
  }

  const renderForm = () => (
    <Card className="mb-6 border-blue-200 bg-blue-50/50">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">
          {editingId ? 'Edit Contract Type' : 'New Contract Type'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Full-Time Employee"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="employmentType">Employment Type</Label>
            <Select
              value={formData.employmentType}
              onValueChange={(value) => setFormData({ ...formData, employmentType: value as any })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EMPLOYMENT_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="laborLawProfile">Labor Law Profile *</Label>
            <Select
              value={formData.laborLawProfileId}
              onValueChange={(value) => setFormData({ ...formData, laborLawProfileId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select profile" />
              </SelectTrigger>
              <SelectContent>
                {laborLawProfiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.name} {profile.isDefault && '(Default)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultFtePercent">Default FTE %</Label>
            <Input
              id="defaultFtePercent"
              type="number"
              min="0"
              max="100"
              value={formData.defaultFtePercent || ''}
              onChange={(e) => setFormData({ ...formData, defaultFtePercent: Number(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="agreedWeeklyHours">Agreed Weekly Hours</Label>
            <Input
              id="agreedWeeklyHours"
              type="number"
              min="0"
              step="0.5"
              value={formData.agreedWeeklyHours || ''}
              onChange={(e) => setFormData({ ...formData, agreedWeeklyHours: e.target.value ? Number(e.target.value) : null })}
              placeholder="e.g., 37.5"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="maxPlannedWeeklyHours">Max Planned Weekly Hours</Label>
            <Input
              id="maxPlannedWeeklyHours"
              type="number"
              min="0"
              step="0.5"
              value={formData.maxPlannedWeeklyHours || ''}
              onChange={(e) => setFormData({ ...formData, maxPlannedWeeklyHours: e.target.value ? Number(e.target.value) : null })}
              placeholder="e.g., 45"
            />
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium mb-4">Overtime Settings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="overtimeAllowed"
                checked={formData.overtimeAllowed}
                onCheckedChange={(checked) => setFormData({ ...formData, overtimeAllowed: checked })}
              />
              <Label htmlFor="overtimeAllowed">Overtime Allowed</Label>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Overtime Exemptions (Roles)</Label>
              <MultiSelect
                options={roles.map(r => ({ id: r.id, name: r.name }))}
                selectedIds={selectedRoleIds}
                onChange={setSelectedRoleIds}
                placeholder="Select roles exempt from overtime..."
              />
              <p className="text-xs text-gray-500">
                Select roles that are exempt from overtime calculations
              </p>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <h4 className="font-medium mb-4">Contract Limits</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxWeekendsPerMonth">Max Weekends per Month</Label>
              <Input
                id="maxWeekendsPerMonth"
                type="number"
                min="0"
                max="5"
                value={formData.maxWeekendsPerMonth || ''}
                onChange={(e) => setFormData({ ...formData, maxWeekendsPerMonth: e.target.value ? Number(e.target.value) : null })}
                placeholder="Leave empty for no limit"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customBreakMinutes">Custom Break (minutes)</Label>
              <Input
                id="customBreakMinutes"
                type="number"
                min="0"
                value={formData.customBreakMinutes || ''}
                onChange={(e) => setFormData({ ...formData, customBreakMinutes: e.target.value ? Number(e.target.value) : null })}
                placeholder="Leave empty to use legal minimum"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {editingId ? 'Update' : 'Create'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Contract Rules</h2>
          <p className="text-sm text-gray-500">
            Define contract types with specific employment conditions and limits
          </p>
        </div>
        {!isCreating && !editingId && (
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            New Contract Type
          </Button>
        )}
      </div>

      {laborLawProfiles.length === 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-4">
            <div className="flex items-center space-x-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              <span>Please create a Labor Law Profile first before adding contract types.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {(isCreating || editingId) && renderForm()}

      {contractTypes.length === 0 && !isCreating ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No contract types defined yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Create contract types to define employment conditions for your employees
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3 font-medium text-sm">Name</th>
                <th className="text-left p-3 font-medium text-sm">Employment Type</th>
                <th className="text-left p-3 font-medium text-sm">FTE %</th>
                <th className="text-left p-3 font-medium text-sm">Weekly Hours</th>
                <th className="text-left p-3 font-medium text-sm">Labor Law Profile</th>
                <th className="text-left p-3 font-medium text-sm">Employees</th>
                <th className="text-left p-3 font-medium text-sm">Overtime</th>
                <th className="text-left p-3 font-medium text-sm">Exempt Roles</th>
                <th className="text-right p-3 font-medium text-sm">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contractTypes.map((ct) => (
                <tr 
                  key={ct.id} 
                  className={`border-b hover:bg-gray-50 ${editingId === ct.id ? 'bg-blue-50' : ''}`}
                >
                  <td className="p-3">
                    <span className="font-medium">{ct.name}</span>
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-xs">
                      {EMPLOYMENT_TYPE_LABELS[ct.employmentType]}
                    </Badge>
                  </td>
                  <td className="p-3 text-sm">{ct.defaultFtePercent}%</td>
                  <td className="p-3 text-sm">
                    {ct.agreedWeeklyHours ? `${ct.agreedWeeklyHours}h` : '-'}
                    {ct.maxPlannedWeeklyHours && (
                      <span className="text-gray-500 ml-1">
                        (max: {ct.maxPlannedWeeklyHours}h)
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-sm text-blue-600">
                    {ct.laborLawProfile?.name || '-'}
                  </td>
                  <td className="p-3 text-sm">
                    <span className="flex items-center">
                      <Users className="h-3 w-3 mr-1" />
                      {ct._count?.employees || 0}
                    </span>
                  </td>
                  <td className="p-3 text-sm">
                    {ct.overtimeAllowed ? (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                        Allowed
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Not Allowed
                      </Badge>
                    )}
                  </td>
                  <td className="p-3 text-sm">
                    {ct.overtimeExemptRoleIds && ct.overtimeExemptRoleIds.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {ct.overtimeExemptRoleIds.slice(0, 2).map((roleId) => {
                          const role = roles.find(r => r.id === roleId)
                          return role ? (
                            <Badge key={roleId} variant="outline" className="text-xs">
                              {role.name}
                            </Badge>
                          ) : null
                        })}
                        {ct.overtimeExemptRoleIds.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{ct.overtimeExemptRoleIds.length - 2}
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">None</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(ct)}
                        disabled={editingId !== null || isCreating}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(ct)}
                        disabled={editingId !== null || isCreating || (ct._count?.employees || 0) > 0}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
