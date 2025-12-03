import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DocumentDuplicateIcon,
  PlusIcon,
  PencilIcon,
  DocumentArrowDownIcon,
  ClipboardDocumentIcon,
  ChevronDownIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

export type TemplateAction = 'create' | 'save' | 'edit' | 'apply' | 'copy-week'

interface TemplatesDropdownProps {
  onAction: (action: TemplateAction) => void
}

export default function TemplatesDropdown({ onAction }: TemplatesDropdownProps) {
  const { t } = useTranslation('schedule')
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleAction = (action: TemplateAction) => {
    setIsOpen(false)
    onAction(action)
  }

  const menuItems = [
    {
      action: 'create' as TemplateAction,
      icon: PlusIcon,
      label: t('templates.create_new', 'Create New Template'),
      description: t('templates.create_new_desc', 'Create a new schedule template')
    },
    {
      action: 'save' as TemplateAction,
      icon: DocumentArrowDownIcon,
      label: t('templates.save_as', 'Save as Template'),
      description: t('templates.save_as_desc', 'Save current week as a template')
    },
    {
      action: 'edit' as TemplateAction,
      icon: PencilIcon,
      label: t('templates.edit', 'Edit Template'),
      description: t('templates.edit_desc', 'Modify an existing template')
    },
    {
      action: 'apply' as TemplateAction,
      icon: DocumentDuplicateIcon,
      label: t('templates.apply', 'Apply Template'),
      description: t('templates.apply_desc', 'Apply a template to current week')
    },
    {
      action: 'copy-week' as TemplateAction,
      icon: ClipboardDocumentIcon,
      label: t('templates.copy_week', 'Copy Week'),
      description: t('templates.copy_week_desc', 'Copy shifts from another week')
    }
  ]

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 text-sm rounded-md border border-gray-300 hover:bg-gray-50 bg-white flex items-center gap-2"
      >
        <DocumentDuplicateIcon className="w-4 h-4" />
        <span className="hidden sm:inline">{t('templates.title', 'Templates')}</span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40 sm:hidden" onClick={() => setIsOpen(false)} />
          <div
            ref={dropdownRef}
            className="fixed inset-x-0 bottom-0 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:bottom-auto sm:mt-2 w-full sm:w-72 bg-white rounded-t-2xl sm:rounded-lg shadow-lg border border-gray-200 z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{t('templates.title', 'Templates')}</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="py-1 pb-safe">
              {menuItems.map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.action}
                    onClick={() => handleAction(item.action)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start gap-3 transition-colors"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-[#31BCFF]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900">{item.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{item.description}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
