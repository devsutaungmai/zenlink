'use client'

import React, { useState, useRef, useEffect } from 'react'
import { CheckIcon, ChevronDownIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface MultiSelectOption {
  id: string
  name: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selectedIds: string[]
  onChange: (selectedIds: string[]) => void
  placeholder?: string
  label?: string
  required?: boolean
  error?: string
  className?: string
  maxHeight?: string
  disabled?: boolean
}

export function MultiSelect({
  options,
  selectedIds,
  onChange,
  placeholder = 'Select...',
  label,
  required,
  error,
  className = '',
  maxHeight = 'max-h-60',
  disabled = false,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggle = (optionId: string) => {
    if (selectedIds.includes(optionId)) {
      onChange(selectedIds.filter(id => id !== optionId))
    } else {
      onChange([...selectedIds, optionId])
    }
  }

  const handleRemove = (optionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selectedIds.filter(id => id !== optionId))
  }

  const selectedOptions = options.filter(opt => selectedIds.includes(opt.id))

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative" ref={dropdownRef}>
        <div
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`relative w-full rounded-md border px-3 py-2 text-left focus:outline-none focus:ring-1 ${
            disabled
              ? 'bg-gray-100 cursor-not-allowed opacity-60'
              : 'cursor-pointer'
          } ${
            error
              ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
              : 'border-gray-300 focus:border-[#31BCFF] focus:ring-[#31BCFF]'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1 flex-1 min-h-[24px]">
              {selectedOptions.length === 0 ? (
                <span className="text-gray-500">{placeholder}</span>
              ) : (
                selectedOptions.map((option) => (
                  <span
                    key={option.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#31BCFF] text-white text-sm"
                  >
                    {option.name}
                    {!disabled && (
                      <button
                        type="button"
                        onClick={(e) => handleRemove(option.id, e)}
                        className="hover:bg-[#31BCFF]/80 rounded-sm"
                      >
                        <XMarkIcon className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))
              )}
            </div>
            <ChevronDownIcon
              className={`w-5 h-5 text-gray-400 transition-transform ${
                isOpen ? 'transform rotate-180' : ''
              }`}
            />
          </div>
        </div>

        {isOpen && !disabled && (
          <div className={`absolute z-10 mt-1 w-full rounded-md bg-white shadow-lg border border-gray-300 ${maxHeight} overflow-auto`}>
            {options.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No options available</div>
            ) : (
              options.map((option) => {
                const isSelected = selectedIds.includes(option.id)
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => handleToggle(option.id)}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between ${
                      isSelected ? 'bg-blue-50' : ''
                    }`}
                  >
                    <span className={isSelected ? 'font-medium text-[#31BCFF]' : 'text-gray-900'}>
                      {option.name}
                    </span>
                    {isSelected && <CheckIcon className="w-5 h-5 text-[#31BCFF]" />}
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>

      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  )
}
