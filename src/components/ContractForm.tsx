'use client'

import React, { useState, useEffect } from 'react'
import { useUser } from '@/shared/lib/useUser'
import Swal from 'sweetalert2'
import { Employee, EmployeeGroup } from '@prisma/client'

interface ContractFormProps {
  onClose: () => void
  onContractCreated: (contract: any) => void
  initialEmployeeId?: string
}

interface ContractTemplate {
  id: string
  name: string
  body: string
  logoPath?: string
  logoPosition: string
  employeeGroup: {
    name: string
  }
}

export default function ContractForm({ onClose, onContractCreated, initialEmployeeId }: ContractFormProps) {
  const [formData, setFormData] = useState({
    employeeId: initialEmployeeId || '',
    employeeGroupId: '',
    contractTemplateId: '',
    startDate: '',
    endDate: '',
    contractPersonId: ''
  })
  const [showPreview, setShowPreview] = useState(false)
  const { user } = useUser()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [employeeGroups, setEmployeeGroups] = useState<EmployeeGroup[]>([])
  const [contractTemplates, setContractTemplates] = useState<ContractTemplate[]>([])

  useEffect(() => {
    if (!initialEmployeeId) return
    setFormData(prev => (
      prev.employeeId === initialEmployeeId ? prev : { ...prev, employeeId: initialEmployeeId }
    ))
  }, [initialEmployeeId])

  useEffect(() => {
    const fetchData = async () => {
      const [employeesRes, groupsRes, templatesRes] = await Promise.all([
        fetch('/api/employees'),
        fetch('/api/employee-groups'),
        fetch('/api/contract-templates')
      ]);
      
      setEmployees(await employeesRes.json())
      
      setEmployeeGroups(await groupsRes.json())
      setContractTemplates(await templatesRes.json())
    }
    fetchData()
  }, [])

  const getSelectedData = () => {
    const selectedEmployee = employees.find(emp => emp.id === formData.employeeId)
    const selectedEmployeeGroup = employeeGroups.find(eg => eg.id === formData.employeeGroupId)
    const selectedContractTemplate = contractTemplates.find(ct => ct.id === formData.contractTemplateId)
    const selectedContractPerson = employees.find(emp => emp.id === formData.contractPersonId)
    
    return {
      employee: selectedEmployee,
      employeeGroup: selectedEmployeeGroup,
      contractTemplate: selectedContractTemplate,
      contractPerson: selectedContractPerson
    }
  }

  const formatContractBody = (body: string, data: any) => {
    if (!body || !data.employee) return body
    
    return body
      // Support both formats: {{variable}} and [VARIABLE] for backwards compatibility
      .replace(/\{\{employee_name\}\}/g, `${data.employee.firstName} ${data.employee.lastName}`)
      .replace(/\{\{employee_first_name\}\}/g, data.employee.firstName || '')
      .replace(/\{\{employee_last_name\}\}/g, data.employee.lastName || '')
      .replace(/\{\{employee_email\}\}/g, data.employee.email || '')
      .replace(/\{\{employee_mobile\}\}/g, data.employee.mobile || '')
      .replace(/\{\{employee_address\}\}/g, data.employee.address || '')
      .replace(/\{\{employee_number\}\}/g, data.employee.employeeNo || '')
      .replace(/\{\{start_date\}\}/g, formData.startDate ? new Date(formData.startDate).toLocaleDateString() : '{{start_date}}')
      .replace(/\{\{end_date\}\}/g, formData.endDate ? new Date(formData.endDate).toLocaleDateString() : 'Indefinite')
      .replace(/\{\{contract_person\}\}/g, data.contractPerson ? `${data.contractPerson.firstName} ${data.contractPerson.lastName}` : '{{contract_person}}')
      .replace(/\{\{employee_group\}\}/g, data.employeeGroup?.name || '{{employee_group}}')
      .replace(/\{\{department\}\}/g, data.employee.department?.name || '{{department}}')
      .replace(/\{\{today\}\}/g, new Date().toLocaleDateString())
      // Legacy format support
      .replace(/\[EMPLOYEE_NAME\]/g, `${data.employee.firstName} ${data.employee.lastName}`)
      .replace(/\[EMPLOYEE_FIRST_NAME\]/g, data.employee.firstName || '')
      .replace(/\[EMPLOYEE_LAST_NAME\]/g, data.employee.lastName || '')
      .replace(/\[EMPLOYEE_EMAIL\]/g, data.employee.email || '')
      .replace(/\[EMPLOYEE_MOBILE\]/g, data.employee.mobile || '')
      .replace(/\[EMPLOYEE_ADDRESS\]/g, data.employee.address || '')
      .replace(/\[EMPLOYEE_NUMBER\]/g, data.employee.employeeNo || '')
      .replace(/\[START_DATE\]/g, formData.startDate ? new Date(formData.startDate).toLocaleDateString() : '[START_DATE]')
      .replace(/\[END_DATE\]/g, formData.endDate ? new Date(formData.endDate).toLocaleDateString() : 'Indefinite')
      .replace(/\[CONTRACT_PERSON\]/g, data.contractPerson ? `${data.contractPerson.firstName} ${data.contractPerson.lastName}` : '[CONTRACT_PERSON]')
      .replace(/\[EMPLOYEE_GROUP\]/g, data.employeeGroup?.name || '[EMPLOYEE_GROUP]')
      .replace(/\[TODAY\]/g, new Date().toLocaleDateString())
  }

  const selectedData = getSelectedData()
  const canShowPreview = formData.contractTemplateId && formData.employeeId

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const response = await fetch('/api/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...formData,
        startDate: new Date(formData.startDate),
        endDate: formData.endDate ? new Date(formData.endDate) : null,
      }),
    })

    if (response.ok) {
      const newContract = await response.json();
      const employee = employees.find(emp => emp.id === newContract.employeeId);
      const employeeGroup = employeeGroups.find(eg => eg.id === newContract.employeeGroupId);
      const contractTemplate = contractTemplates.find(ct => ct.id === newContract.contractTemplateId);
      const contractPerson = employees.find(emp => emp.id === newContract.contractPersonId);

      onContractCreated({
        ...newContract,
        employee: { firstName: employee?.firstName, lastName: employee?.lastName },
        employeeGroup: { name: employeeGroup?.name },
        contractTemplate: { name: contractTemplate?.name },
        contractPerson: { firstName: contractPerson?.firstName, lastName: contractPerson?.lastName },
      });
      
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'success',
        title: 'Contract created successfully!'
      })
      onClose()
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Something went wrong!',
      })
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Create New Contract</h2>
          {canShowPreview && (
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors duration-200"
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
          )}
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">&times;</button>
      </div>
      
      <div className={`flex ${showPreview ? 'flex-row' : 'flex-col'}`}>
        {/* Form Section */}
        <div className={`${showPreview ? 'w-1/2 border-r border-gray-200' : 'w-full'}`}>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Employee</label>
              <select
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              >
                <option value="">Select Employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Employee Group</label>
              <select
                value={formData.employeeGroupId}
                onChange={(e) => setFormData({ ...formData, employeeGroupId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              >
                <option value="">Select Employee Group</option>
                {employeeGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contract Template</label>
              <select
                value={formData.contractTemplateId}
                onChange={(e) => setFormData({ ...formData, contractTemplateId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              >
                <option value="">Select Contract Template</option>
                {contractTemplates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contract Start Date</label>
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contract Expiration Date (Optional)</label>
                <input
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contract Person</label>
              <select
                value={formData.contractPersonId}
                onChange={(e) => setFormData({ ...formData, contractPersonId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                required
              >
                <option value="">Select Employee</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
              </select>
            </div>
            <div className="flex justify-end space-x-4">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 bg-[#31BCFF] text-white rounded-lg hover:bg-[#2ba3e4]">
                Create Contract
              </button>
            </div>
          </form>
        </div>

        {/* Preview Section */}
        {showPreview && canShowPreview && selectedData.contractTemplate && (
          <div className="w-1/2 p-6 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contract Preview</h3>
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm max-h-96 overflow-y-auto">
              {/* Template Header */}
              <div className="mb-4 pb-4 border-b border-gray-200">
                <div className={`flex ${selectedData.contractTemplate?.logoPosition === 'TOP_LEFT' ? 'justify-start' : 
                  selectedData.contractTemplate?.logoPosition === 'TOP_CENTER' ? 'justify-center' : 'justify-end'} items-center gap-4 mb-2`}>
                  {selectedData.contractTemplate?.logoPath && (
                    <img 
                      src={selectedData.contractTemplate.logoPath} 
                      alt="Company Logo" 
                      className="h-12 w-auto"
                      onError={(e) => {
                        console.error('Failed to load logo:', selectedData.contractTemplate?.logoPath)
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  )}
                </div>
                <h4 className="text-xl font-bold text-gray-900">{selectedData.contractTemplate.name}</h4>
              </div>
              
              {/* Contract Body */}
              <div className="prose prose-sm max-w-none">
                <div 
                  className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: formatContractBody(selectedData.contractTemplate.body, selectedData)
                      .replace(/\n/g, '<br>')
                  }}
                />
              </div>
              
              {/* Contract Details */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-500">Employee:</span>
                    <div className="text-gray-900">
                      {selectedData.employee ? `${selectedData.employee.firstName} ${selectedData.employee.lastName}` : 'Not selected'}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Start Date:</span>
                    <div className="text-gray-900">
                      {formData.startDate ? new Date(formData.startDate).toLocaleDateString() : 'Not set'}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">End Date:</span>
                    <div className="text-gray-900">
                      {formData.endDate ? new Date(formData.endDate).toLocaleDateString() : 'Indefinite'}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Contract Person:</span>
                    <div className="text-gray-900">
                      {selectedData.contractPerson ? `${selectedData.contractPerson.firstName} ${selectedData.contractPerson.lastName}` : 'Not selected'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {!selectedData.employee && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-700">
                  Select an employee to see personalized contract details.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
