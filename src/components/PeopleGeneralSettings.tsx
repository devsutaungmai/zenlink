'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import Swal from 'sweetalert2'
import {
  UsersIcon,
  UserPlusIcon,
  EyeIcon,
  ClipboardDocumentCheckIcon,
  Cog6ToothIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Department {
  id: string
  name: string
}

interface EmployeeGroup {
  id: string
  name: string
}

interface Role {
  id: string
  name: string
}

interface EmployeeSettingsData {
  requireFirstName: boolean
  requireLastName: boolean
  requireBirthday: boolean
  requireGender: boolean
  requireAddress: boolean
  requirePhone: boolean
  requireEmail: boolean
  requireSocialSecurityNo: boolean
  requireEmployeeNo: boolean
  requireDateOfHire: boolean
  requireHoursPerMonth: boolean
  requireBankAccount: boolean
  requireDepartment: boolean
  requireSalaryRate: boolean
  incompleteProfileBehavior: 'SHOW_WARNING' | 'BLOCK_SCHEDULING' | 'NONE'
  defaultDepartmentId: string | null
  defaultEmployeeGroupId: string | null
  defaultRoleId: string | null
  rolesCanViewEmployees: string[]
  employeesCanSeeContactInfo: boolean
  limitVisibilityByDepartment: boolean
  onboardingRequiredFields: string[]
  requireManagerApproval: boolean
  sendMissingInfoReminder: boolean
  reminderDaysAfterHire: number
  defaultLanguage: string
  employeeNotificationsEnabled: boolean
  employeesCanEditProfile: boolean
  employeeEditableFields: string[]
}

const PROFILE_FIELDS = [
  { id: 'address', label: 'Address' },
  { id: 'bankAccount', label: 'Bank Account' },
  { id: 'phone', label: 'Phone Number' },
  { id: 'email', label: 'Email' },
  { id: 'socialSecurityNo', label: 'Social Security Number' },
]

const EDITABLE_FIELDS = [
  { id: 'phone', label: 'Phone Number' },
  { id: 'address', label: 'Address' },
  { id: 'profilePhoto', label: 'Profile Photo' },
  { id: 'email', label: 'Email' },
  { id: 'bankAccount', label: 'Bank Account' },
]

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'no', name: 'Norwegian' },
  { code: 'de', name: 'German' },
]

const defaultSettings: EmployeeSettingsData = {
  requireFirstName: true,
  requireLastName: true,
  requireBirthday: true,
  requireGender: true,
  requireAddress: false,
  requirePhone: true,
  requireEmail: false,
  requireSocialSecurityNo: false,
  requireEmployeeNo: true,
  requireDateOfHire: true,
  requireHoursPerMonth: true,
  requireBankAccount: false,
  requireDepartment: true,
  requireSalaryRate: false,
  incompleteProfileBehavior: 'SHOW_WARNING',
  defaultDepartmentId: null,
  defaultEmployeeGroupId: null,
  defaultRoleId: null,
  rolesCanViewEmployees: [],
  employeesCanSeeContactInfo: true,
  limitVisibilityByDepartment: false,
  onboardingRequiredFields: [],
  requireManagerApproval: false,
  sendMissingInfoReminder: true,
  reminderDaysAfterHire: 7,
  defaultLanguage: 'en',
  employeeNotificationsEnabled: true,
  employeesCanEditProfile: true,
  employeeEditableFields: ['phone', 'address', 'profilePhoto'],
}

export default function PeopleGeneralSettings() {
  const { t } = useTranslation('settings')
  const [settings, setSettings] = useState<EmployeeSettingsData>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  
  const [departments, setDepartments] = useState<Department[]>([])
  const [employeeGroups, setEmployeeGroups] = useState<EmployeeGroup[]>([])
  const [roles, setRoles] = useState<Role[]>([])

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/employee-settings')
      if (response.ok) {
        const data = await response.json()
        setSettings(data)
      }
    } catch (error) {
      console.error('Error fetching employee settings:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchOptions = useCallback(async () => {
    try {
      const [deptRes, groupRes, roleRes] = await Promise.all([
        fetch('/api/departments'),
        fetch('/api/employee-groups'),
        fetch('/api/roles'),
      ])
      
      if (deptRes.ok) {
        const data = await deptRes.json()
        setDepartments(data.departments || data || [])
      }
      if (groupRes.ok) {
        const data = await groupRes.json()
        setEmployeeGroups(data.employeeGroups || data || [])
      }
      if (roleRes.ok) {
        const data = await roleRes.json()
        setRoles(data.roles || data || [])
      }
    } catch (error) {
      console.error('Error fetching options:', error)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
    fetchOptions()
  }, [fetchSettings, fetchOptions])

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch('/api/employee-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (response.ok) {
        setHasChanges(false)
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: t('people.general_setting.messages.saved'),
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
        })
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: t('people.general_setting.messages.error'),
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
      })
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = <K extends keyof EmployeeSettingsData>(
    key: K,
    value: EmployeeSettingsData[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const toggleArrayItem = (key: keyof EmployeeSettingsData, item: string) => {
    const currentArray = settings[key] as string[]
    const newArray = currentArray.includes(item)
      ? currentArray.filter(i => i !== item)
      : [...currentArray, item]
    updateSetting(key, newArray as EmployeeSettingsData[typeof key])
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-[#31BCFF]" />
        <span className="ml-2 text-gray-600">{t('people.general_setting.loading')}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('people.general_setting.title')}</h2>
          <p className="text-gray-600 mt-1">{t('people.general_setting.description')}</p>
        </div>
        {hasChanges && (
          <Badge variant="secondary" className="bg-amber-100 text-amber-800">
            {t('people.general_setting.unsaved_changes')}
          </Badge>
        )}
      </div>

      {/* Required Profile Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="w-5 h-5" />
            {t('people.general_setting.required_fields.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">{t('people.general_setting.required_fields.description')}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label htmlFor="requireFirstName">{t('people.general_setting.required_fields.first_name')}</Label>
              <Switch
                id="requireFirstName"
                checked={settings.requireFirstName}
                onCheckedChange={(checked) => updateSetting('requireFirstName', checked)}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label htmlFor="requireLastName">{t('people.general_setting.required_fields.last_name')}</Label>
              <Switch
                id="requireLastName"
                checked={settings.requireLastName}
                onCheckedChange={(checked) => updateSetting('requireLastName', checked)}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label htmlFor="requireBirthday">{t('people.general_setting.required_fields.birthday')}</Label>
              <Switch
                id="requireBirthday"
                checked={settings.requireBirthday}
                onCheckedChange={(checked) => updateSetting('requireBirthday', checked)}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label htmlFor="requireGender">{t('people.general_setting.required_fields.gender')}</Label>
              <Switch
                id="requireGender"
                checked={settings.requireGender}
                onCheckedChange={(checked) => updateSetting('requireGender', checked)}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label htmlFor="requireAddress">{t('people.general_setting.required_fields.address')}</Label>
              <Switch
                id="requireAddress"
                checked={settings.requireAddress}
                onCheckedChange={(checked) => updateSetting('requireAddress', checked)}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label htmlFor="requirePhone">{t('people.general_setting.required_fields.phone')}</Label>
              <Switch
                id="requirePhone"
                checked={settings.requirePhone}
                onCheckedChange={(checked) => updateSetting('requirePhone', checked)}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label htmlFor="requireEmail">{t('people.general_setting.required_fields.email')}</Label>
              <Switch
                id="requireEmail"
                checked={settings.requireEmail}
                onCheckedChange={(checked) => updateSetting('requireEmail', checked)}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label htmlFor="requireSocialSecurityNo">{t('people.general_setting.required_fields.ssn')}</Label>
              <Switch
                id="requireSocialSecurityNo"
                checked={settings.requireSocialSecurityNo}
                onCheckedChange={(checked) => updateSetting('requireSocialSecurityNo', checked)}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label htmlFor="requireEmployeeNo">{t('people.general_setting.required_fields.employee_no')}</Label>
              <Switch
                id="requireEmployeeNo"
                checked={settings.requireEmployeeNo}
                onCheckedChange={(checked) => updateSetting('requireEmployeeNo', checked)}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label htmlFor="requireDateOfHire">{t('people.general_setting.required_fields.date_of_hire')}</Label>
              <Switch
                id="requireDateOfHire"
                checked={settings.requireDateOfHire}
                onCheckedChange={(checked) => updateSetting('requireDateOfHire', checked)}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label htmlFor="requireHoursPerMonth">{t('people.general_setting.required_fields.hours_per_month')}</Label>
              <Switch
                id="requireHoursPerMonth"
                checked={settings.requireHoursPerMonth}
                onCheckedChange={(checked) => updateSetting('requireHoursPerMonth', checked)}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label htmlFor="requireBankAccount">{t('people.general_setting.required_fields.bank_account')}</Label>
              <Switch
                id="requireBankAccount"
                checked={settings.requireBankAccount}
                onCheckedChange={(checked) => updateSetting('requireBankAccount', checked)}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label htmlFor="requireDepartment">{t('people.general_setting.required_fields.department')}</Label>
              <Switch
                id="requireDepartment"
                checked={settings.requireDepartment}
                onCheckedChange={(checked) => updateSetting('requireDepartment', checked)}
              />
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <Label htmlFor="requireSalaryRate">{t('people.general_setting.required_fields.salary_rate')}</Label>
              <Switch
                id="requireSalaryRate"
                checked={settings.requireSalaryRate}
                onCheckedChange={(checked) => updateSetting('requireSalaryRate', checked)}
              />
            </div>
          </div>

          <div className="pt-4">
            <Label htmlFor="incompleteProfileBehavior">{t('people.general_setting.required_fields.incomplete_behavior')}</Label>
            <Select
              value={settings.incompleteProfileBehavior}
              onValueChange={(value) => updateSetting('incompleteProfileBehavior', value as EmployeeSettingsData['incompleteProfileBehavior'])}
            >
              <SelectTrigger className="mt-2 w-full md:w-80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SHOW_WARNING">{t('people.general_setting.required_fields.behavior_options.show_warning')}</SelectItem>
                <SelectItem value="BLOCK_SCHEDULING">{t('people.general_setting.required_fields.behavior_options.block_scheduling')}</SelectItem>
                <SelectItem value="NONE">{t('people.general_setting.required_fields.behavior_options.none')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Default Settings for New Employees */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlusIcon className="w-5 h-5" />
            {t('people.general_setting.defaults.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">{t('people.general_setting.defaults.description')}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="defaultDepartment">{t('people.general_setting.defaults.department')}</Label>
              <Select
                value={settings.defaultDepartmentId || 'none'}
                onValueChange={(value) => updateSetting('defaultDepartmentId', value === 'none' ? null : value)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder={t('people.general_setting.defaults.select_department')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('people.general_setting.defaults.no_default')}</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="defaultEmployeeGroup">{t('people.general_setting.defaults.employee_group')}</Label>
              <Select
                value={settings.defaultEmployeeGroupId || 'none'}
                onValueChange={(value) => updateSetting('defaultEmployeeGroupId', value === 'none' ? null : value)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder={t('people.general_setting.defaults.select_group')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('people.general_setting.defaults.no_default')}</SelectItem>
                  {employeeGroups.map((group) => (
                    <SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="defaultRole">{t('people.general_setting.defaults.role')}</Label>
              <Select
                value={settings.defaultRoleId || 'none'}
                onValueChange={(value) => updateSetting('defaultRoleId', value === 'none' ? null : value)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder={t('people.general_setting.defaults.select_role')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('people.general_setting.defaults.no_default')}</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visibility & Access Rules - COMMENTED OUT
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <EyeIcon className="w-5 h-5" />
            {t('people.general_setting.visibility.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">{t('people.general_setting.visibility.description')}</p>
          
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">{t('people.general_setting.visibility.roles_can_view')}</Label>
              <div className="flex flex-wrap gap-2">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => toggleArrayItem('rolesCanViewEmployees', role.id)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      settings.rolesCanViewEmployees.includes(role.id)
                        ? 'bg-[#31BCFF] text-white border-[#31BCFF]'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-[#31BCFF]'
                    }`}
                  >
                    {settings.rolesCanViewEmployees.includes(role.id) && (
                      <CheckIcon className="w-3 h-3 inline mr-1" />
                    )}
                    {role.name}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">{t('people.general_setting.visibility.roles_hint')}</p>
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label htmlFor="employeesCanSeeContactInfo">{t('people.general_setting.visibility.see_contact_info')}</Label>
                <p className="text-xs text-gray-500">{t('people.general_setting.visibility.see_contact_info_hint')}</p>
              </div>
              <Switch
                id="employeesCanSeeContactInfo"
                checked={settings.employeesCanSeeContactInfo}
                onCheckedChange={(checked) => updateSetting('employeesCanSeeContactInfo', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label htmlFor="limitVisibilityByDepartment">{t('people.general_setting.visibility.limit_by_department')}</Label>
                <p className="text-xs text-gray-500">{t('people.general_setting.visibility.limit_by_department_hint')}</p>
              </div>
              <Switch
                id="limitVisibilityByDepartment"
                checked={settings.limitVisibilityByDepartment}
                onCheckedChange={(checked) => updateSetting('limitVisibilityByDepartment', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      */}

      {/* Onboarding Rules - COMMENTED OUT
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardDocumentCheckIcon className="w-5 h-5" />
            {t('people.general_setting.onboarding.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">{t('people.general_setting.onboarding.description')}</p>
          
          <div>
            <Label className="mb-2 block">{t('people.general_setting.onboarding.required_before_active')}</Label>
            <div className="flex flex-wrap gap-2">
              {PROFILE_FIELDS.map((field) => (
                <button
                  key={field.id}
                  onClick={() => toggleArrayItem('onboardingRequiredFields', field.id)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    settings.onboardingRequiredFields.includes(field.id)
                      ? 'bg-[#31BCFF] text-white border-[#31BCFF]'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-[#31BCFF]'
                  }`}
                >
                  {settings.onboardingRequiredFields.includes(field.id) && (
                    <CheckIcon className="w-3 h-3 inline mr-1" />
                  )}
                  {field.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label htmlFor="requireManagerApproval">{t('people.general_setting.onboarding.manager_approval')}</Label>
              <p className="text-xs text-gray-500">{t('people.general_setting.onboarding.manager_approval_hint')}</p>
            </div>
            <Switch
              id="requireManagerApproval"
              checked={settings.requireManagerApproval}
              onCheckedChange={(checked) => updateSetting('requireManagerApproval', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label htmlFor="sendMissingInfoReminder">{t('people.general_setting.onboarding.send_reminder')}</Label>
              <p className="text-xs text-gray-500">{t('people.general_setting.onboarding.send_reminder_hint')}</p>
            </div>
            <Switch
              id="sendMissingInfoReminder"
              checked={settings.sendMissingInfoReminder}
              onCheckedChange={(checked) => updateSetting('sendMissingInfoReminder', checked)}
            />
          </div>

          {settings.sendMissingInfoReminder && (
            <div className="pl-4 border-l-2 border-[#31BCFF]">
              <Label htmlFor="reminderDaysAfterHire">{t('people.general_setting.onboarding.reminder_days')}</Label>
              <Input
                id="reminderDaysAfterHire"
                type="number"
                min={1}
                max={30}
                value={settings.reminderDaysAfterHire}
                onChange={(e) => updateSetting('reminderDaysAfterHire', parseInt(e.target.value) || 7)}
                className="mt-2 w-32"
              />
            </div>
          )}
        </CardContent>
      </Card>
      */}

      {/* General HR Preferences - COMMENTED OUT
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cog6ToothIcon className="w-5 h-5" />
            {t('people.general_setting.preferences.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">{t('people.general_setting.preferences.description')}</p>
          
          <div>
            <Label htmlFor="defaultLanguage">{t('people.general_setting.preferences.default_language')}</Label>
            <Select
              value={settings.defaultLanguage}
              onValueChange={(value) => updateSetting('defaultLanguage', value)}
            >
              <SelectTrigger className="mt-2 w-full md:w-60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>{lang.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label htmlFor="employeeNotificationsEnabled">{t('people.general_setting.preferences.notifications_enabled')}</Label>
              <p className="text-xs text-gray-500">{t('people.general_setting.preferences.notifications_hint')}</p>
            </div>
            <Switch
              id="employeeNotificationsEnabled"
              checked={settings.employeeNotificationsEnabled}
              onCheckedChange={(checked) => updateSetting('employeeNotificationsEnabled', checked)}
            />
          </div>

          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label htmlFor="employeesCanEditProfile">{t('people.general_setting.preferences.can_edit_profile')}</Label>
              <p className="text-xs text-gray-500">{t('people.general_setting.preferences.can_edit_profile_hint')}</p>
            </div>
            <Switch
              id="employeesCanEditProfile"
              checked={settings.employeesCanEditProfile}
              onCheckedChange={(checked) => updateSetting('employeesCanEditProfile', checked)}
            />
          </div>

          {settings.employeesCanEditProfile && (
            <div className="pl-4 border-l-2 border-[#31BCFF]">
              <Label className="mb-2 block">{t('people.general_setting.preferences.editable_fields')}</Label>
              <div className="flex flex-wrap gap-2">
                {EDITABLE_FIELDS.map((field) => (
                  <button
                    key={field.id}
                    onClick={() => toggleArrayItem('employeeEditableFields', field.id)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                      settings.employeeEditableFields.includes(field.id)
                        ? 'bg-[#31BCFF] text-white border-[#31BCFF]'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-[#31BCFF]'
                    }`}
                  >
                    {settings.employeeEditableFields.includes(field.id) && (
                      <CheckIcon className="w-3 h-3 inline mr-1" />
                    )}
                    {field.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      */}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="bg-[#31BCFF] hover:bg-[#31BCFF]/90"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              {t('people.general_setting.buttons.saving')}
            </>
          ) : (
            t('people.general_setting.buttons.save')
          )}
        </Button>
      </div>
    </div>
  )
}
