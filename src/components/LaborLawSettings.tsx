'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Clock, Calendar, Shield, Save, RotateCcw, Loader2 } from 'lucide-react'
import { LaborLawRules, COUNTRY_RULES, DEFAULT_LABOR_RULES, updateLaborLawValidatorRules } from '@/shared/lib/laborLawValidation'
import Swal from 'sweetalert2'
import { useTranslation } from 'react-i18next'

interface LaborLawSettingsProps {
  onRulesChange?: (rules: LaborLawRules) => void
}

interface SettingsFromDB {
  id?: string
  countryCode: string
  maxHoursPerDay: number
  maxHoursPerWeek: number
  maxOvertimePerDay: number
  maxOvertimePerWeek: number
  maxConsecutiveDays: number
  minRestHoursBetweenShifts: number
  longShiftThreshold: number
  minBreakForLongShifts: number
  overtimeThreshold: number
  isActive: boolean
}

export default function LaborLawSettings({ onRulesChange }: LaborLawSettingsProps) {
  const [rules, setRules] = useState<LaborLawRules>(DEFAULT_LABOR_RULES)
  const [selectedCountry, setSelectedCountry] = useState<string>('NO')
  const [hasChanges, setHasChanges] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [savedSettings, setSavedSettings] = useState<Record<string, SettingsFromDB>>({})
  const { t } = useTranslation('settings')

  // Fetch all saved settings from database
  const fetchAllSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/labor-law-settings')
      if (response.ok) {
        const data = await response.json()
        const settingsMap: Record<string, SettingsFromDB> = {}
        
        if (data.settings && data.settings.length > 0) {
          data.settings.forEach((s: SettingsFromDB) => {
            settingsMap[s.countryCode] = s
          })
          
          // Find active setting
          const activeSetting = data.settings.find((s: SettingsFromDB) => s.isActive)
          if (activeSetting) {
            setSelectedCountry(activeSetting.countryCode)
            const loadedRules: LaborLawRules = {
              maxHoursPerDay: activeSetting.maxHoursPerDay,
              maxHoursPerWeek: activeSetting.maxHoursPerWeek,
              maxOvertimePerDay: activeSetting.maxOvertimePerDay,
              maxOvertimePerWeek: activeSetting.maxOvertimePerWeek,
              maxConsecutiveDays: activeSetting.maxConsecutiveDays,
              minRestHoursBetweenShifts: activeSetting.minRestHoursBetweenShifts,
              longShiftThreshold: activeSetting.longShiftThreshold,
              minBreakForLongShifts: activeSetting.minBreakForLongShifts,
              overtimeThreshold: activeSetting.overtimeThreshold,
            }
            setRules(loadedRules)
            updateLaborLawValidatorRules(loadedRules)
          }
        }
        
        setSavedSettings(settingsMap)
      }
    } catch (error) {
      console.error('Error fetching labor law settings:', error)
      // Fall back to Norwegian defaults
      setRules(COUNTRY_RULES['NO'])
      updateLaborLawValidatorRules(COUNTRY_RULES['NO'])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAllSettings()
  }, [fetchAllSettings])

  const handleCountryChange = async (countryCode: string) => {
    setSelectedCountry(countryCode)

    // Check if we have saved settings for this country in our cache
    if (savedSettings[countryCode]) {
      const saved = savedSettings[countryCode]
      const loadedRules: LaborLawRules = {
        maxHoursPerDay: saved.maxHoursPerDay,
        maxHoursPerWeek: saved.maxHoursPerWeek,
        maxOvertimePerDay: saved.maxOvertimePerDay,
        maxOvertimePerWeek: saved.maxOvertimePerWeek,
        maxConsecutiveDays: saved.maxConsecutiveDays,
        minRestHoursBetweenShifts: saved.minRestHoursBetweenShifts,
        longShiftThreshold: saved.longShiftThreshold,
        minBreakForLongShifts: saved.minBreakForLongShifts,
        overtimeThreshold: saved.overtimeThreshold,
      }
      setRules(loadedRules)
      setHasChanges(false)
      return
    }

    // No saved settings for this country, use country defaults
    if (countryCode === 'DEFAULT') {
      setRules(DEFAULT_LABOR_RULES)
    } else if (COUNTRY_RULES[countryCode]) {
      setRules(COUNTRY_RULES[countryCode])
    }

    setHasChanges(true)
  }

  const handleRuleChange = (field: keyof LaborLawRules, value: number) => {
    setRules(prev => ({
      ...prev,
      [field]: value
    }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      
      const response = await fetch('/api/labor-law-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          countryCode: selectedCountry,
          ...rules,
          isActive: true,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save settings')
      }

      const data = await response.json()
      
      // Update cache with saved settings
      setSavedSettings(prev => ({
        ...prev,
        [selectedCountry]: data.settings,
      }))

      // Update the singleton validator with the new rules
      updateLaborLawValidatorRules(rules)

      if (onRulesChange) {
        onRulesChange(rules)
      }

      setHasChanges(false)

      Swal.fire({
        text: 'Settings Saved: Labor law rules have been updated successfully.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        customClass: {
          popup: 'swal-toast-wide'
        }
      })
    } catch (error) {
      console.error('Error saving labor law rules:', error)
      Swal.fire({
        text: 'Error: Failed to save labor law settings.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        customClass: {
          popup: 'swal-toast-wide'
        }
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    // Reset to Norwegian defaults (Arbeidsmiljøloven)
    setRules(COUNTRY_RULES['NO'])
    setSelectedCountry('NO')
    setHasChanges(true)

    Swal.fire({
      text: 'Reset Complete: Labor law rules have been reset to Norwegian defaults (Arbeidsmiljøloven).',
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000,
      customClass: {
        popup: 'swal-toast-wide'
      }
    })
  }

  const getCountryName = (code: string): string => {
    const countryNames: Record<string, string> = {
      'DEFAULT': 'Custom Rules',
      'NO': 'Norway (Arbeidsmiljøloven)',
      'TH': 'Thailand',
      'US': 'United States',
      'GB': 'United Kingdom',
      'DE': 'Germany'
    }
    return countryNames[code] || code
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
          <h2 className="text-2xl font-bold text-gray-900">{t('title')}</h2>
          <p className="text-gray-600 mt-1">{t('labor.description')}</p>
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

      {/* Country Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            {t('labor.setting.country_region.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="country">
                {t('labor.setting.country_region.label1')}
              </Label>
              <Select value={selectedCountry} onValueChange={handleCountryChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NO">
                    🇳🇴 Norway (Arbeidsmiljøloven) - Default
                    {savedSettings['NO'] && <span className="ml-2 text-green-600">✓</span>}
                  </SelectItem>
                  <SelectItem value="TH">
                    🇹🇭 Thailand
                    {savedSettings['TH'] && <span className="ml-2 text-green-600">✓</span>}
                  </SelectItem>
                  <SelectItem value="US">
                    🇺🇸 United States
                    {savedSettings['US'] && <span className="ml-2 text-green-600">✓</span>}
                  </SelectItem>
                  <SelectItem value="GB">
                    🇬🇧 United Kingdom
                    {savedSettings['GB'] && <span className="ml-2 text-green-600">✓</span>}
                  </SelectItem>
                  <SelectItem value="DE">
                    🇩🇪 Germany
                    {savedSettings['DE'] && <span className="ml-2 text-green-600">✓</span>}
                  </SelectItem>
                  <SelectItem value="DEFAULT">
                    Custom Rules
                    {savedSettings['DEFAULT'] && <span className="ml-2 text-green-600">✓</span>}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                <strong>{t('labor.setting.country_region.label2')}:</strong> {getCountryName(selectedCountry)}
                {savedSettings[selectedCountry] && (
                  <Badge variant="outline" className="ml-2 text-green-600 border-green-600">
                    Saved
                  </Badge>
                )}
                <br />
                <span className="text-xs">
                  {t('labor.setting.country_region.info2')}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rules Configuration */}
      <div className="space-y-6">
        {/* Daily Limits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {t('labor.setting.daily_work_limits.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxHoursPerDay">{t('labor.setting.daily_work_limits.max_hours_per_day.label')}</Label>
                <Input
                  id="maxHoursPerDay"
                  type="number"
                  min="1"
                  max="24"
                  step="0.5"
                  value={rules.maxHoursPerDay}
                  onChange={(e) => handleRuleChange('maxHoursPerDay', parseFloat(e.target.value))}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">{t('labor.setting.daily_work_limits.max_hours_per_day.description')}</p>
              </div>

              <div>
                <Label htmlFor="overtimeThreshold">{t('labor.setting.daily_work_limits.regular_hours_threshold.label')}</Label>
                <Input
                  id="overtimeThreshold"
                  type="number"
                  min="1"
                  max="12"
                  step="0.5"
                  value={rules.overtimeThreshold}
                  onChange={(e) => handleRuleChange('overtimeThreshold', parseFloat(e.target.value))}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">{t('labor.setting.daily_work_limits.regular_hours_threshold.description')}</p>
              </div>

              <div>
                <Label htmlFor="maxOvertimePerDay">{t('labor.setting.daily_work_limits.max_overtime_per_day.label')}</Label>
                <Input
                  id="maxOvertimePerDay"
                  type="number"
                  min="0"
                  max="12"
                  step="0.5"
                  value={rules.maxOvertimePerDay}
                  onChange={(e) => handleRuleChange('maxOvertimePerDay', parseFloat(e.target.value))}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">{t('labor.setting.daily_work_limits.max_overtime_per_day.description')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Limits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {t('labor.setting.weekly_work_limits.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxHoursPerWeek">
                  {t('labor.setting.weekly_work_limits.max_hours_per_week.label')}
                </Label>
                <Input
                  id="maxHoursPerWeek"
                  type="number"
                  min="1"
                  max="168"
                  step="1"
                  value={rules.maxHoursPerWeek}
                  onChange={(e) => handleRuleChange('maxHoursPerWeek', parseFloat(e.target.value))}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('labor.setting.weekly_work_limits.max_hours_per_week.description')}
                </p>
              </div>

              <div>
                <Label htmlFor="maxOvertimePerWeek">
                  {t('labor.setting.weekly_work_limits.max_overtime_per_week.label')}
                </Label>
                <Input
                  id="maxOvertimePerWeek"
                  type="number"
                  min="0"
                  max="50"
                  step="1"
                  value={rules.maxOvertimePerWeek}
                  onChange={(e) => handleRuleChange('maxOvertimePerWeek', parseFloat(e.target.value))}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('labor.setting.weekly_work_limits.max_overtime_per_week.description')}
                </p>
              </div>

              <div>
                <Label htmlFor="maxConsecutiveDays">
                  {t('labor.setting.weekly_work_limits.max_consecutive_days.label')}
                </Label>
                <Input
                  id="maxConsecutiveDays"
                  type="number"
                  min="1"
                  max="14"
                  step="1"
                  value={rules.maxConsecutiveDays}
                  onChange={(e) => handleRuleChange('maxConsecutiveDays', parseInt(e.target.value))}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('labor.setting.weekly_work_limits.max_consecutive_days.description')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Breaks & Rest */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              {t('labor.setting.breaks_rest_periods.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minRestHoursBetweenShifts">
                  {t('labor.setting.breaks_rest_periods.min_rest_between_shifts.label')}
                </Label>
                <Input
                  id="minRestHoursBetweenShifts"
                  type="number"
                  min="1"
                  max="24"
                  step="0.5"
                  value={rules.minRestHoursBetweenShifts}
                  onChange={(e) => handleRuleChange('minRestHoursBetweenShifts', parseFloat(e.target.value))}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('labor.setting.breaks_rest_periods.min_rest_between_shifts.description')}
                </p>
              </div>

              <div>
                <Label htmlFor="longShiftThreshold">
                  {t('labor.setting.breaks_rest_periods.min_break_duration.label')}
                </Label>
                <Input
                  id="longShiftThreshold"
                  type="number"
                  min="1"
                  max="12"
                  step="0.5"
                  value={rules.longShiftThreshold}
                  onChange={(e) => handleRuleChange('longShiftThreshold', parseFloat(e.target.value))}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('labor.setting.breaks_rest_periods.min_break_duration.description')}
                </p>
              </div>

              <div>
                <Label htmlFor="minBreakForLongShifts">
                  {t('labor.setting.breaks_rest_periods.long_shift_threshold.label')}
                </Label>
                <Input
                  id="minBreakForLongShifts"
                  type="number"
                  min="0"
                  max="120"
                  step="5"
                  value={rules.minBreakForLongShifts}
                  onChange={(e) => handleRuleChange('minBreakForLongShifts', parseInt(e.target.value))}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {t('labor.setting.breaks_rest_periods.long_shift_threshold.description')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={handleReset}
          className="flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          {t('labor.setting.buttons.reset')}
        </Button>

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
          {isSaving ? 'Saving...' : t('labor.setting.buttons.save')}
        </Button>
      </div>

      {/* Current Rules Summary */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg">{t('labor.setting.current_rules_summary.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div>
              <span className="font-medium">
                {t('labor.setting.current_rules_summary.max_daily')}:</span> {rules.maxHoursPerDay}h
            </div>
            <div>
              <span className="font-medium">
                {t('labor.setting.current_rules_summary.max_weekly')}:</span> {rules.maxHoursPerWeek}h
            </div>
            <div>
              <span className="font-medium">
                {t('labor.setting.current_rules_summary.min_rest')}:</span> {rules.minRestHoursBetweenShifts}h
            </div>
            <div>
              <span className="font-medium">
                {t('labor.setting.current_rules_summary.max_consecutive')}:</span> {rules.maxConsecutiveDays} days
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
