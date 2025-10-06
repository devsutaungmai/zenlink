'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, Clock, Calendar, Shield, Save, RotateCcw } from 'lucide-react'
import { LaborLawRules, COUNTRY_RULES, DEFAULT_LABOR_RULES } from '@/shared/lib/laborLawValidation'
import Swal from 'sweetalert2'

interface LaborLawSettingsProps {
  onRulesChange?: (rules: LaborLawRules) => void
}

export default function LaborLawSettings({ onRulesChange }: LaborLawSettingsProps) {
  const [rules, setRules] = useState<LaborLawRules>(DEFAULT_LABOR_RULES)
  const [selectedCountry, setSelectedCountry] = useState<string>('DEFAULT')
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    // Load saved rules from localStorage or use defaults
    const savedRules = localStorage.getItem('laborLawRules')
    const savedCountry = localStorage.getItem('laborLawCountry')
    
    if (savedRules) {
      try {
        setRules(JSON.parse(savedRules))
      } catch (error) {
        console.error('Error loading saved labor law rules:', error)
      }
    }
    
    if (savedCountry) {
      setSelectedCountry(savedCountry)
    }
  }, [])

  const handleCountryChange = (countryCode: string) => {
    setSelectedCountry(countryCode)
    
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

  const handleSave = () => {
    try {
      localStorage.setItem('laborLawRules', JSON.stringify(rules))
      localStorage.setItem('laborLawCountry', selectedCountry)
      
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
    }
  }

  const handleReset = () => {
    setRules(DEFAULT_LABOR_RULES)
    setSelectedCountry('DEFAULT')
    setHasChanges(true)
    
    Swal.fire({
      text: 'Reset Complete: Labor law rules have been reset to defaults.',
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
      'DEFAULT': 'Default Rules',
      'TH': 'Thailand',
      'US': 'United States',
      'GB': 'United Kingdom',
      'DE': 'Germany'
    }
    return countryNames[code] || code
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Labor Law Settings</h2>
          <p className="text-gray-600 mt-1">Configure work hour limits and rest period requirements</p>
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
            Country/Region
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="country">Select Country/Region</Label>
              <Select value={selectedCountry} onValueChange={handleCountryChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEFAULT">Default Rules</SelectItem>
                  <SelectItem value="TH">🇹🇭 Thailand</SelectItem>
                  <SelectItem value="US">🇺🇸 United States</SelectItem>
                  <SelectItem value="GB">🇬🇧 United Kingdom</SelectItem>
                  <SelectItem value="DE">🇩🇪 Germany</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                <strong>Current:</strong> {getCountryName(selectedCountry)}
                <br />
                <span className="text-xs">Rules will be applied to all shift validations</span>
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
              Daily Work Limits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxHoursPerDay">Maximum Hours Per Day</Label>
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
                <p className="text-xs text-gray-500 mt-1">Maximum work hours allowed per day</p>
              </div>

              <div>
                <Label htmlFor="overtimeThreshold">Regular Hours Threshold</Label>
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
                <p className="text-xs text-gray-500 mt-1">Hours before overtime rules apply</p>
              </div>

              <div>
                <Label htmlFor="maxOvertimePerDay">Maximum Overtime Per Day</Label>
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
                <p className="text-xs text-gray-500 mt-1">Maximum overtime hours per day</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Limits */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Weekly Work Limits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxHoursPerWeek">Maximum Hours Per Week</Label>
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
                <p className="text-xs text-gray-500 mt-1">Maximum work hours per week</p>
              </div>

              <div>
                <Label htmlFor="maxOvertimePerWeek">Maximum Overtime Per Week</Label>
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
                <p className="text-xs text-gray-500 mt-1">Maximum overtime hours per week</p>
              </div>

              <div>
                <Label htmlFor="maxConsecutiveDays">Maximum Consecutive Days</Label>
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
                <p className="text-xs text-gray-500 mt-1">Maximum consecutive working days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Breaks & Rest */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Breaks & Rest Periods
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minRestHoursBetweenShifts">Minimum Rest Between Shifts (hours)</Label>
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
                <p className="text-xs text-gray-500 mt-1">Minimum rest time required between shifts</p>
              </div>

              <div>
                <Label htmlFor="longShiftThreshold">Long Shift Threshold (hours)</Label>
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
                <p className="text-xs text-gray-500 mt-1">Hours that trigger mandatory break requirement</p>
              </div>

              <div>
                <Label htmlFor="minBreakForLongShifts">Minimum Break Duration (minutes)</Label>
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
                <p className="text-xs text-gray-500 mt-1">Required break duration for long shifts</p>
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
          Reset to Defaults
        </Button>
        
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges}
          className="flex items-center gap-2 bg-[#31BCFF] hover:bg-[#31BCFF]/90"
        >
          <Save className="w-4 h-4" />
          Save Settings
        </Button>
      </div>

      {/* Current Rules Summary */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-lg">Current Rules Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
            <div>
              <span className="font-medium">Max Daily:</span> {rules.maxHoursPerDay}h
            </div>
            <div>
              <span className="font-medium">Max Weekly:</span> {rules.maxHoursPerWeek}h
            </div>
            <div>
              <span className="font-medium">Min Rest:</span> {rules.minRestHoursBetweenShifts}h
            </div>
            <div>
              <span className="font-medium">Max Consecutive:</span> {rules.maxConsecutiveDays} days
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
