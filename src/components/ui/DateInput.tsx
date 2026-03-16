'use client'

import { useEffect, useState } from 'react'

interface DateInputProps {
  value: string
  onChange: (value: string) => void
  className?: string
  placeholder?: string
}

function isSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent)
}

function shouldUseTextFallback(): boolean {
  if (typeof window === 'undefined') return false
  if (isSafari()) return true
  const input = document.createElement('input')
  input.setAttribute('type', 'date')
  input.setAttribute('value', 'not-a-date')
  return input.value === 'not-a-date'
}

function toDisplayValue(iso: string): string {
  if (!iso) return ''
  const parts = iso.split('-')
  if (parts.length === 3) return `${parts[1]}/${parts[2]}/${parts[0]}`
  return iso
}

function toISOValue(raw: string): string {
  const mmddyyyy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(raw)
  if (mmddyyyy) {
    const [, m, d, y] = mmddyyyy
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  const yyyymmdd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw)
  if (yyyymmdd) return raw
  return ''
}

export default function DateInput({ value, onChange, className, placeholder }: DateInputProps) {
  const [nativeSupport, setNativeSupport] = useState(true)
  const [textValue, setTextValue] = useState('')

  useEffect(() => {
    const fallback = shouldUseTextFallback()
    setNativeSupport(!fallback)
    if (fallback) {
      setTextValue(toDisplayValue(value))
    }
  }, [])

  useEffect(() => {
    if (!nativeSupport) {
      setTextValue(toDisplayValue(value))
    }
  }, [value, nativeSupport])

  if (nativeSupport) {
    return (
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={className}
        placeholder={placeholder}
      />
    )
  }

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    setTextValue(raw)
    const iso = toISOValue(raw)
    if (iso) onChange(iso)
  }

  const handleBlur = () => {
    const iso = toISOValue(textValue)
    if (iso) {
      setTextValue(toDisplayValue(iso))
    }
  }

  return (
    <input
      type="text"
      value={textValue}
      onChange={handleTextChange}
      onBlur={handleBlur}
      className={className}
      placeholder={placeholder || 'MM/DD/YYYY'}
    />
  )
}
