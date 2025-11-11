'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { useUser } from '@/shared/lib/useUser'
import { 
  PlusIcon, 
  DocumentTextIcon,
  PhotoIcon,
  XMarkIcon,
  TrashIcon,
  PencilIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'
import { useTranslation } from 'react-i18next'

interface EmployeeGroup {
  id: string
  name: string
}

interface ContractTemplate {
  id: string
  name: string
  body: string
  logoPath?: string
  logoPosition: string
  createdAt: string
  employeeGroup: {
    name: string
  }
}

interface ContractTemplateFormData {
  employeeGroupId: string
  name: string
  body: string
  logoFile?: File | null
  logoPosition: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
}

export default function ContractTemplateForm() {
  const { user } = useUser()
  const [loading, setLoading] = useState(false)
  const [employeeGroups, setEmployeeGroups] = useState<EmployeeGroup[]>([])
  const [contractTemplates, setContractTemplates] = useState<ContractTemplate[]>([])
  const [formData, setFormData] = useState<ContractTemplateFormData>({
    employeeGroupId: '',
    name: '',
    body: '',
    logoFile: null,
    logoPosition: 'top-right'
  })
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
   const { t } = useTranslation('settings')
 
  useEffect(() => {
    fetchEmployeeGroups()
    fetchContractTemplates()
  }, [])

  const fetchEmployeeGroups = async () => {
    try {
      const response = await fetch('/api/employee-groups')
      if (response.ok) {
        const groups = await response.json()
        setEmployeeGroups(groups)
      }
    } catch (error) {
      console.error('Error fetching employee groups:', error)
    }
  }

  const fetchContractTemplates = async () => {
    try {
      const response = await fetch('/api/contract-templates')
      if (response.ok) {
        const templates = await response.json()
        setContractTemplates(templates)
      }
    } catch (error) {
      console.error('Error fetching contract templates:', error)
    }
  }

  const handleInputChange = (field: keyof ContractTemplateFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          icon: 'error',
          title: 'Please select an image file'
        })
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          icon: 'error',
          title: 'File size must be less than 5MB'
        })
        return
      }

      setFormData(prev => ({ ...prev, logoFile: file }))
      
      // Create preview
      const reader = new FileReader()
      reader.onload = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeLogo = () => {
    setFormData(prev => ({ ...prev, logoFile: null }))
    setLogoPreview(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.employeeGroupId || !formData.name || !formData.body) {
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'warning',
        title: 'Please fill in all required fields'
      })
      return
    }

    setLoading(true)
    
    try {
      const submitData = new FormData()
      submitData.append('employeeGroupId', formData.employeeGroupId)
      submitData.append('name', formData.name)
      submitData.append('body', formData.body)
      submitData.append('logoPosition', formData.logoPosition)
      
      if (formData.logoFile) {
        submitData.append('logo', formData.logoFile)
      }

      const response = await fetch('/api/contract-templates', {
        method: 'POST',
        body: submitData
      })

      if (response.ok) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          icon: 'success',
          title: 'Contract template created successfully!'
        })
        
        // Reset form
        setFormData({
          employeeGroupId: '',
          name: '',
          body: '',
          logoFile: null,
          logoPosition: 'top-right'
        })
        setLogoPreview(null)
        
        // Refresh templates list
        fetchContractTemplates()
      } else {
        const errorData = await response.json()
        console.error('Server error:', errorData)
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 4000,
          timerProgressBar: true,
          icon: 'error',
          title: `Failed to create template: ${errorData.error || 'Unknown error'}`
        })
        throw new Error(errorData.error || 'Failed to create contract template')
      }
    } catch (error) {
      console.error('Error creating contract template:', error)
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'error',
        title: 'Failed to create contract template. Please try again.'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    const result = await Swal.fire({
      title: 'Delete Contract Template',
      text: `Are you sure you want to delete "${templateName}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    })

    if (result.isConfirmed) {
      try {
        const response = await fetch(`/api/contract-templates/${templateId}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          Swal.fire({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            icon: 'success',
            title: 'Template deleted successfully!'
          })
          fetchContractTemplates()
        } else {
          const errorData = await response.json()
          Swal.fire({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 4000,
            timerProgressBar: true,
            icon: 'error',
            title: `Failed to delete template: ${errorData.error || 'Unknown error'}`
          })
        }
      } catch (error) {
        console.error('Error deleting template:', error)
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          icon: 'error',
          title: 'Failed to delete template. Please try again.'
        })
      }
    }
  }

  const handleViewTemplate = (template: ContractTemplate) => {
    Swal.fire({
      title: template.name,
      html: `
        <div class="text-left">
          <p class="text-sm text-gray-600 mb-4">Employee Group: ${template.employeeGroup.name}</p>
          <div class="max-h-96 overflow-y-auto">
            <pre class="whitespace-pre-wrap text-sm">${template.body}</pre>
          </div>
        </div>
      `,
      showCloseButton: true,
      showConfirmButton: false,
      width: '600px',
      customClass: {
        htmlContainer: 'text-left'
      }
    })
  }

  return (
    <div className="space-y-8">
      {/* Create Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5 text-[#31BCFF]" />
            <h2 className="text-lg font-semibold text-gray-900">
              {t('people.contract_setup_setting.title')}
            </h2>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {t('people.contract_setup_setting.description')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Employee Group Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('people.contract_setup_setting.employee_group_label')}  <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.employeeGroupId}
            onChange={(e) => handleInputChange('employeeGroupId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none"
            required
          >
                        <option value="">{t('people.contract_setup_setting.employee_group_placeholder')}</option>

            {employeeGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>

        {/* Template Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('people.contract_setup_setting.template_name_label')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder={t('people.contract_setup_setting.template_name_placeholder')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none"
            required
          />
        </div>

        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('people.contract_setup_setting.company_logo_label')}<span className="text-gray-500">{t('people.contract_setup_setting.company_logo_optional')}</span>
          </label>
          
          {!logoPreview ? (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#31BCFF] transition-colors">
              <PhotoIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
             <p className="text-sm text-gray-600 mb-2">{t('people.contract_setup_setting.upload_logo_text')}</p>
              <p className="text-xs text-gray-500 mb-4">{t('people.contract_setup_setting.logo_format')}</p>
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-[#31BCFF] text-white rounded-lg hover:bg-[#2ba3e4] cursor-pointer transition-colors">
                <PlusIcon className="w-4 h-4" />
                                {t('people.contract_setup_setting.buttons.choose_file')}

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <div className="border border-gray-300 rounded-lg p-4">
              <div className="flex items-start gap-4">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="w-20 h-20 object-contain border border-gray-200 rounded"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{formData.logoFile?.name}</p>
                  <p className="text-xs text-gray-500">
                    {formData.logoFile && (formData.logoFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <button
                    type="button"
                    onClick={removeLogo}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                  >
                    <XMarkIcon className="w-3 h-3" />
                    {t('people.contract_setup_setting.remove')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Logo Position */}
        {logoPreview && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('people.contract_setup_setting.logo_position_label')}
            </label>
            <select
              value={formData.logoPosition}
              onChange={(e) => handleInputChange('logoPosition', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none"
            >
              <option value="top-left">{t('people.contract_setup_setting.logo_positions.top_left')}</option>
              <option value="top-center">{t('people.contract_setup_setting.logo_positions.top_center')}</option>
              <option value="top-right">{t('people.contract_setup_setting.logo_positions.top_right')}</option>
              <option value="bottom-left">{t('people.contract_setup_setting.logo_positions.bottom_left')}</option>
              <option value="bottom-center">{t('people.contract_setup_setting.logo_positions.bottom_center')}</option>
              <option value="bottom-right">{t('people.contract_setup_setting.logo_positions.bottom_right')}</option>
            </select>
          </div>
        )}

        {/* Contract Body */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('people.contract_setup_setting.contract_body_label')}<span className="text-red-500">*</span>
          </label>
          <div className="border border-gray-300 rounded-lg overflow-hidden">
            <textarea
              value={formData.body}
              onChange={(e) => handleInputChange('body', e.target.value)}
              placeholder={t('people.contract_setup_setting.contract_body_placeholder')}
              rows={12}
              className="w-full px-3 py-2 resize-none focus:ring-2 focus:ring-[#31BCFF] focus:border-[#31BCFF] outline-none"
              required
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {/* Use variables in double curly braces like {`{{employee_name}}, {{start_date}}, {{department}}`} to automatically fill employee data */}
            {t('people.contract_setup_setting.variables_hint')}
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2 bg-[#31BCFF] text-white rounded-lg hover:bg-[#2ba3e4] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#31BCFF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                {t('people.contract_setup_setting.loading')}
              </>
            ) : (
              <>
                <PlusIcon className="w-4 h-4" />
                {t('people.contract_setup_setting.buttons.create_template')}
              </>
            )}
          </button>
        </div>
      </form>
    </div>

    {/* Templates List */}
    {contractTemplates.length > 0 && (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <DocumentTextIcon className="w-5 h-5 text-[#31BCFF]" />
          <h2 className="text-lg font-semibold text-gray-900">
              {t('people.contract_setup_setting.existing_templates.title')}
            </h2>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {t('people.contract_setup_setting.existing_templates.description')}
          </p>
        </div>

        <div className="p-6">
          <div className="grid gap-4">
            {contractTemplates.map((template) => (
              <div key={template.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      {template.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {t('people.contract_setup_setting.existing_templates.employee_group')}: <span className="font-medium">{template.employeeGroup.name}</span>
                    </p>
                    <p className="text-xs text-gray-500">
                      {t('people.contract_setup_setting.existing_templates.created')}: {new Date(template.createdAt).toLocaleDateString()}
                    </p>
                    {template.logoPath && (
                      <p className="text-xs text-gray-500 mt-1">
                        {t('people.contract_setup_setting.existing_templates.logo')}:  {template.logoPosition.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleViewTemplate(template)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                    >
                      <EyeIcon className="w-4 h-4" />
                      {t('people.contract_setup_setting.existing_templates.buttons.view')}
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id, template.name)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-red-700 bg-red-100 hover:bg-red-200 rounded-md transition-colors"
                    >
                      <TrashIcon className="w-4 h-4" />
                      {t('people.contract_setup_setting.existing_templates.buttons.delete')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}
  </div>
  )
}
