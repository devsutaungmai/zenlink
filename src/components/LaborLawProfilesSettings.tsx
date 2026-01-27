'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Shield,
  Save,
  X,
  Loader2,
  Star
} from 'lucide-react'
import Swal from 'sweetalert2'
import { useTranslation } from 'react-i18next'

interface LaborLawSettings {
  id: string
  countryCode: string
  maxHoursPerDay: number
  maxHoursPerWeek: number
  isActive: boolean
}

interface LaborLawProfile {
  id: string
  name: string
  description: string | null
  isDefault: boolean
  laborLawSettingsId: string | null
  laborLawSettings?: LaborLawSettings | null
  _count?: {
    contractTypes: number
  }
}

export default function LaborLawProfilesSettings() {
  const { t } = useTranslation('settings')
  const [profiles, setProfiles] = useState<LaborLawProfile[]>([])
  const [laborLawSettings, setLaborLawSettings] = useState<LaborLawSettings[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    laborLawSettingsId: '',
    isDefault: false,
  })

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true)
      const [profilesRes, settingsRes] = await Promise.all([
        fetch('/api/labor-law-profiles?includeSettings=true'),
        fetch('/api/labor-law-settings'),
      ])

      if (profilesRes.ok) {
        const data = await profilesRes.json()
        setProfiles(data.profiles || [])
      }

      if (settingsRes.ok) {
        const data = await settingsRes.json()
        setLaborLawSettings(data.settings || [])
      }
    } catch (error) {
      console.error('Error fetching labor law profiles:', error)
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
      description: '',
      laborLawSettingsId: '',
      isDefault: false,
    })
  }

  const handleCreate = () => {
    resetForm()
    const activeSettings = laborLawSettings.find(s => s.isActive)
    setFormData(prev => ({
      ...prev,
      laborLawSettingsId: activeSettings?.id || '',
    }))
    setIsCreating(true)
    setEditingId(null)
  }

  const handleEdit = (profile: LaborLawProfile) => {
    setFormData({
      name: profile.name,
      description: profile.description || '',
      laborLawSettingsId: profile.laborLawSettingsId || '',
      isDefault: profile.isDefault,
    })
    setEditingId(profile.id)
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
        title: t('labor_law_profiles.validation_error'),
        text: t('labor_law_profiles.name_required_error'),
      })
      return
    }

    try {
      setIsSaving(true)
      const url = editingId 
        ? `/api/labor-law-profiles/${editingId}`
        : '/api/labor-law-profiles'
      
      const response = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          laborLawSettingsId: formData.laborLawSettingsId || null,
        }),
      })

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: editingId ? t('labor_law_profiles.update') : t('labor_law_profiles.create'),
          text: editingId ? t('labor_law_profiles.updated_success') : t('labor_law_profiles.created_success'),
          timer: 1500,
          showConfirmButton: false,
        })
        handleCancel()
        fetchData()
      } else {
        const error = await response.json()
        Swal.fire({
          icon: 'error',
          title: t('labor_law_profiles.error'),
          text: error.error || t('labor_law_profiles.save_failed'),
        })
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      Swal.fire({
        icon: 'error',
        title: t('labor_law_profiles.error'),
        text: t('labor_law_profiles.save_failed'),
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (profile: LaborLawProfile) => {
    if ((profile._count?.contractTypes || 0) > 0) {
      Swal.fire({
        icon: 'error',
        title: t('labor_law_profiles.cannot_delete'),
        text: t('labor_law_profiles.cannot_delete_linked'),
      })
      return
    }

    const result = await Swal.fire({
      icon: 'warning',
      title: t('labor_law_profiles.delete_profile'),
      text: t('labor_law_profiles.delete_confirm', { name: profile.name }),
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: t('labor_law_profiles.delete'),
    })

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/labor-law-profiles/${profile.id}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          Swal.fire({
            icon: 'success',
            title: t('labor_law_profiles.delete'),
            text: t('labor_law_profiles.deleted_success'),
            timer: 1500,
            showConfirmButton: false,
          })
          fetchData()
        } else {
          const error = await response.json()
          Swal.fire({
            icon: 'error',
            title: t('labor_law_profiles.error'),
            text: error.error || t('labor_law_profiles.delete_failed'),
          })
        }
      } catch (error) {
        console.error('Error deleting profile:', error)
      }
    }
  }

  const handleSetDefault = async (profile: LaborLawProfile) => {
    try {
      const response = await fetch(`/api/labor-law-profiles/${profile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      })

      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Error setting default:', error)
    }
  }

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
          <h2 className="text-xl font-semibold">{t('labor_law_profiles.title')}</h2>
          <p className="text-sm text-gray-500">
            {t('labor_law_profiles.description')}
          </p>
        </div>
        {!isCreating && !editingId && (
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            {t('labor_law_profiles.new_profile')}
          </Button>
        )}
      </div>

      {(isCreating || editingId) && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              {editingId ? t('labor_law_profiles.edit_profile') : t('labor_law_profiles.new_profile')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('labor_law_profiles.name_required')}</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('labor_law_profiles.name_placeholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="laborLawSettings">{t('labor_law_profiles.labor_law_rules')}</Label>
                <Select
                  value={formData.laborLawSettingsId || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, laborLawSettingsId: value === 'none' ? '' : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('labor_law_profiles.select_labor_law_rules')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('labor_law_profiles.none_use_defaults')}</SelectItem>
                    {laborLawSettings.map((setting) => (
                      <SelectItem key={setting.id} value={setting.id}>
                        {setting.countryCode} - Max {setting.maxHoursPerDay}h/day, {setting.maxHoursPerWeek}h/week
                        {setting.isActive && ` (${t('labor_law_profiles.active')})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">{t('labor_law_profiles.description_label')}</Label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
                placeholder={t('labor_law_profiles.description_placeholder')}
                rows={2}
                className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isDefault"
                checked={formData.isDefault}
                onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
              />
              <Label htmlFor="isDefault">{t('labor_law_profiles.set_as_default')}</Label>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                {t('labor_law_profiles.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {editingId ? t('labor_law_profiles.update') : t('labor_law_profiles.create')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {profiles.length === 0 && !isCreating ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="h-12 w-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">{t('labor_law_profiles.no_profiles')}</p>
            <p className="text-sm text-gray-400 mt-1">
              {t('labor_law_profiles.no_profiles_hint')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{t('labor_law_profiles.table.name')}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{t('labor_law_profiles.table.labor_law_rules')}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{t('labor_law_profiles.table.contract_types')}</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">{t('labor_law_profiles.table.description')}</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">{t('labor_law_profiles.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <tr 
                  key={profile.id}
                  className={`border-b last:border-0 hover:bg-gray-50 ${editingId === profile.id ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{profile.name}</span>
                      {profile.isDefault && (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          <Star className="h-3 w-3 mr-1" />
                          {t('labor_law_profiles.default_badge')}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {profile.laborLawSettings ? (
                      <span>
                        {profile.laborLawSettings.countryCode} - 
                        Max {profile.laborLawSettings.maxHoursPerDay}h/day, 
                        {profile.laborLawSettings.maxHoursPerWeek}h/week
                      </span>
                    ) : (
                      <span className="text-gray-400">{t('labor_law_profiles.using_defaults')}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {profile._count?.contractTypes || 0}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                    {profile.description || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end space-x-1">
                      {!profile.isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(profile)}
                          title="Set as default"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(profile)}
                        disabled={editingId !== null || isCreating}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(profile)}
                        disabled={editingId !== null || isCreating || (profile._count?.contractTypes || 0) > 0}
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
