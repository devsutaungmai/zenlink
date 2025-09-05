'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { PlusIcon, DocumentTextIcon, MagnifyingGlassIcon, PencilIcon, TrashIcon, ArrowDownTrayIcon, PencilSquareIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import ContractForm from '@/components/ContractForm'
import { useUser } from '@/app/lib/useUser'
import Swal from 'sweetalert2'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface Contract {
  id: string
  employee: {
    firstName: string
    lastName: string
    email?: string
    mobile?: string
    address?: string
    employeeNo?: string
    department?: {
      name: string
    }
  }
  employeeGroup: {
    name: string
  }
  contractTemplate: {
    name: string
    body: string
    logoPath?: string
    logoPosition: string
  }
  startDate: string
  endDate?: string
  contractPerson: {
    firstName: string
    lastName: string
  }
  signedStatus?: string
  signatureData?: string
  signedAt?: string
  signedBy?: string
}

interface ContractStatistics {
  totalEmployees: number
  employeesWithContracts: number
  employeesWithoutContracts: number
  contractsExpiringThisMonth: number
  expiredContracts: number
  employeesMissingContracts: Array<{
    id: string
    firstName: string
    lastName: string
    employeeNo: string | null
    email: string | null
    department: { name: string }
    employeeGroup: { name: string } | null
  }>
  contractsExpiring: Contract[]
  contractsExpired: Contract[]
}

export default function ContractsPage() {
  const { t } = useTranslation()
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [previewContract, setPreviewContract] = useState<Contract | null>(null)
  const [signingContract, setSigningContract] = useState<Contract | null>(null)
  const [showSignatureForm, setShowSignatureForm] = useState(false)
  const [signature, setSignature] = useState('')
  const [statistics, setStatistics] = useState<ContractStatistics | null>(null)
  const [activeFilter, setActiveFilter] = useState<'all' | 'missing' | 'expiring' | 'expired'>('all')
  const { user } = useUser()

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)

  const fetchContracts = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [contractsResponse, statisticsResponse] = await Promise.all([
        fetch('/api/contracts'),
        fetch('/api/contracts/statistics')
      ])
      
      if (!contractsResponse.ok) {
        const errorData = await contractsResponse.json()
        throw new Error(errorData.error || 'Failed to fetch contracts')
      }
      
      if (!statisticsResponse.ok) {
        const errorData = await statisticsResponse.json()
        throw new Error(errorData.error || 'Failed to fetch statistics')
      }
      
      const contractsData = await contractsResponse.json()
      const statisticsData = await statisticsResponse.json()
      
      if (Array.isArray(contractsData)) {
        setContracts(contractsData)
      } else {
        console.error('Expected array but got:', contractsData)
        throw new Error('Invalid data format received from server')
      }
      
      setStatistics(statisticsData)
    } catch (error) {
      console.error('Error fetching data:', error)
      setError(error instanceof Error ? error.message : 'An unknown error occurred')
      setContracts([])
      setStatistics(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContracts()
  }, [])

  const handleContractCreated = (newContract: any) => {
    setContracts([...contracts, newContract])
    setShowCreateForm(false)
  }

  const handleDelete = async (id: string) => {
    try {
      const result = await Swal.fire({
        title: 'Delete Contract?',
        text: 'This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#31BCFF',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!',
        cancelButtonText: 'Cancel'
      })

      if (result.isConfirmed) {
        const res = await fetch(`/api/contracts/${id}`, {
          method: 'DELETE',
        })
        
        if (res.ok) {
          setContracts(contracts.filter(contract => contract.id !== id))
          
          await Swal.fire({
            title: 'Success!',
            text: 'Contract deleted successfully.',
            icon: 'success',
            confirmButtonColor: '#31BCFF',
          })
        } else {
          throw new Error('Failed to delete contract')
        }
      }
    } catch (error) {
      console.error('Error deleting contract:', error)
      Swal.fire({
        title: 'Error!',
        text: 'Failed to delete contract.',
        icon: 'error',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      })
    }
  }

  const handleDownload = async (id: string, contract: Contract) => {
    try {
      // Show loading toast
      Swal.fire({
        title: 'Generating PDF...',
        text: 'Please wait while we prepare your contract document.',
        icon: 'info',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const response = await fetch(`/api/contracts/${id}/download`);
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Get the filename from the response headers
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `${contract.contractTemplate.name}_${contract.employee.firstName}_${contract.employee.lastName}.pdf`;
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Close loading and show success
      Swal.close();
      Swal.fire({
        title: 'Success!',
        text: 'Contract downloaded successfully.',
        icon: 'success',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      });

    } catch (error) {
      console.error('Error downloading contract:', error);
      Swal.close();
      Swal.fire({
        title: 'Error!',
        text: 'Failed to download contract.',
        icon: 'error',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      });
    }
  }

  const handleSign = async (contract: Contract) => {
    if (contract.signedStatus && contract.signedStatus !== 'UNSIGNED') {
      Swal.fire({
        title: 'Contract Already Signed',
        text: `This contract has already been signed ${contract.signedStatus === 'SIGNED_PAPER' ? 'on paper' : 'electronically'}.`,
        icon: 'info',
        confirmButtonColor: '#31BCFF',
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Choose Signing Method',
      text: 'How would you like to sign this contract?',
      icon: 'question',
      showDenyButton: true,
      showCancelButton: true,
      confirmButtonText: 'Electronic Signature',
      denyButtonText: 'Manual (Paper)',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#3085d6',
      denyButtonColor: '#6c757d',
      cancelButtonColor: '#d33',
    });

    console.log('SweetAlert result:', result);

    if (result.isConfirmed) {
      // Electronic signature
      console.log('Electronic signature selected');
      setSigningContract(contract);
      setShowSignatureForm(true);
    } else if (result.isDenied) {
      // Manual signature
      console.log('Manual signature selected');
      const confirmResult = await Swal.fire({
        title: 'Mark as Signed on Paper?',
        text: 'This will mark the contract as signed manually on paper.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#31BCFF',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, mark as signed',
        cancelButtonText: 'Cancel'
      });

      console.log('Manual confirmation result:', confirmResult);

      if (confirmResult.isConfirmed) {
        console.log('Submitting manual signature...');
        await submitSignature('MANUAL', null, contract.id);
      }
    } else {
      console.log('User cancelled signing');
    }
  };

  const submitSignature = async (signingType: 'MANUAL' | 'ELECTRONIC', signatureData: any, contractId: string) => {
    try {
      console.log('Submitting signature:', { signingType, contractId, signatureData });
      
      const response = await fetch(`/api/contracts/${contractId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signingType,
          signatureData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || 'Failed to sign contract');
      }

      const updatedContract = await response.json();
      console.log('Updated contract received:', updatedContract);
      
      // Update the contract in the list - ensure we spread the original contract data
      setContracts(prevContracts => 
        prevContracts.map(c => 
          c.id === contractId ? { 
            ...c, 
            signedStatus: updatedContract.signedStatus,
            signatureData: updatedContract.signatureData,
            signedAt: updatedContract.signedAt,
            signedBy: updatedContract.signedBy
          } : c
        )
      );

      // Close any open modals
      setShowSignatureForm(false);
      setSigningContract(null);
      setSignature('');

      Swal.fire({
        title: 'Success!',
        text: `Contract signed ${signingType === 'MANUAL' ? 'on paper' : 'electronically'} successfully.`,
        icon: 'success',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      });

    } catch (error) {
      console.error('Error signing contract:', error);
      Swal.fire({
        title: 'Error!',
        text: error instanceof Error ? error.message : 'Failed to sign contract.',
        icon: 'error',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true
      });
    }
  };

  const handleElectronicSign = async () => {
    if (!signature.trim()) {
      Swal.fire({
        title: 'Signature Required',
        text: 'Please enter your signature before submitting.',
        icon: 'warning',
        confirmButtonColor: '#31BCFF',
      });
      return;
    }

    if (signingContract) {
      const signatureData = {
        signature: signature.trim(),
        signedBy: user?.firstName + ' ' + user?.lastName,
        timestamp: new Date().toISOString(),
      };

      await submitSignature('ELECTRONIC', signatureData, signingContract.id);
    }
  };

  const getSignedStatusBadge = (status?: string) => {
    if (!status || status === 'UNSIGNED') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Unsigned
        </span>
      );
    } else if (status === 'SIGNED_PAPER') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          Signed (Paper)
        </span>
      );
    } else if (status === 'SIGNED_ELECTRONIC') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Signed (Electronic)
        </span>
      );
    }
    return null;
  };

  const isContractExpiringThisMonth = (endDate?: string) => {
    if (!endDate) return false;
    
    const contractEndDate = new Date(endDate);
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    return (
      contractEndDate.getMonth() === currentMonth &&
      contractEndDate.getFullYear() === currentYear &&
      contractEndDate >= currentDate
    );
  };

  const isContractExpired = (endDate?: string) => {
    if (!endDate) return false;
    
    const contractEndDate = new Date(endDate);
    const currentDate = new Date();
    
    return contractEndDate < currentDate;
  };

  const getExpirationBadge = (endDate?: string) => {
    if (isContractExpired(endDate)) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 ml-2">
          Expired
        </span>
      );
    } else if (isContractExpiringThisMonth(endDate)) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 ml-2">
          Expiring This Month
        </span>
      );
    }
    return null;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString()
  }

  const formatContractBody = (body: string, contract: Contract) => {
    if (!body || !contract?.employee || !contract?.contractPerson || !contract?.employeeGroup) {
      return body || ''
    }
    
    return body
      // Support both formats: {{variable}} and [VARIABLE] for backwards compatibility
      .replace(/\{\{employee_name\}\}/g, `${contract.employee.firstName} ${contract.employee.lastName}`)
      .replace(/\{\{employee_first_name\}\}/g, contract.employee.firstName || '')
      .replace(/\{\{employee_last_name\}\}/g, contract.employee.lastName || '')
      .replace(/\{\{employee_email\}\}/g, contract.employee.email || '')
      .replace(/\{\{employee_mobile\}\}/g, contract.employee.mobile || '')
      .replace(/\{\{employee_address\}\}/g, contract.employee.address || '')
      .replace(/\{\{employee_number\}\}/g, contract.employee.employeeNo || '')
      .replace(/\{\{start_date\}\}/g, formatDate(contract.startDate))
      .replace(/\{\{end_date\}\}/g, contract.endDate ? formatDate(contract.endDate) : 'Indefinite')
      .replace(/\{\{contract_person\}\}/g, `${contract.contractPerson.firstName} ${contract.contractPerson.lastName}`)
      .replace(/\{\{employee_group\}\}/g, contract.employeeGroup?.name || '{{employee_group}}')
      .replace(/\{\{department\}\}/g, contract.employee.department?.name || '{{department}}')
      .replace(/\{\{today\}\}/g, new Date().toLocaleDateString())
      // Legacy format support
      .replace(/\[EMPLOYEE_NAME\]/g, `${contract.employee.firstName} ${contract.employee.lastName}`)
      .replace(/\[EMPLOYEE_FIRST_NAME\]/g, contract.employee.firstName || '')
      .replace(/\[EMPLOYEE_LAST_NAME\]/g, contract.employee.lastName || '')
      .replace(/\[EMPLOYEE_EMAIL\]/g, contract.employee.email || '')
      .replace(/\[EMPLOYEE_MOBILE\]/g, contract.employee.mobile || '')
      .replace(/\[EMPLOYEE_ADDRESS\]/g, contract.employee.address || '')
      .replace(/\[EMPLOYEE_NUMBER\]/g, contract.employee.employeeNo || '')
      .replace(/\[START_DATE\]/g, formatDate(contract.startDate))
      .replace(/\[END_DATE\]/g, contract.endDate ? formatDate(contract.endDate) : 'Indefinite')
      .replace(/\[CONTRACT_PERSON\]/g, `${contract.contractPerson.firstName} ${contract.contractPerson.lastName}`)
      .replace(/\[EMPLOYEE_GROUP\]/g, contract.employeeGroup?.name || '[EMPLOYEE_GROUP]')
      .replace(/\[TODAY\]/g, new Date().toLocaleDateString())
  }

  // Filter contracts based on search and active filter
  const filteredContracts = contracts.filter(contract => {
    // Search filter
    const matchesSearch = searchTerm === '' || 
      `${contract.employee.firstName} ${contract.employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.contractTemplate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.employeeGroup.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${contract.contractPerson.firstName} ${contract.contractPerson.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
    
    // Status filter
    if (activeFilter === 'all') {
      return matchesSearch
    } else if (activeFilter === 'expiring') {
      return matchesSearch && isContractExpiringThisMonth(contract.endDate)
    } else if (activeFilter === 'expired') {
      return matchesSearch && isContractExpired(contract.endDate)
    } else if (activeFilter === 'missing') {
      // For missing contracts, we'll show a different table
      return false
    }
    
    return matchesSearch
  })

  // Filter missing contracts employees based on search
  const filteredMissingEmployees = statistics?.employeesMissingContracts.filter(employee => 
    searchTerm === '' || 
    `${employee.firstName} ${employee.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employeeNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.department?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.employeeGroup?.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  // Pagination calculations
  const itemsToShow = activeFilter === 'missing' ? filteredMissingEmployees : filteredContracts
  const totalPages = Math.ceil(itemsToShow.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedContracts = filteredContracts.slice(startIndex, endIndex)
  const paginatedMissingEmployees = filteredMissingEmployees.slice(startIndex, endIndex)

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, activeFilter])

  // Calculate expiring contracts count
  const expiringContractsCount = contracts.filter(contract => 
    isContractExpiringThisMonth(contract.endDate)
  ).length;

  const expiredContractsCount = contracts.filter(contract => 
    isContractExpired(contract.endDate)
  ).length;

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Scroll to top of table when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#31BCFF]"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center text-red-600">
          Error: {error}
          <button 
            onClick={fetchContracts}
            className="ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between">
          <div className="mb-4 sm:mb-0">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Contracts
            </h1>
            <p className="mt-2 text-gray-600">
              Manage employee contracts and agreements.
            </p>
            {/* Contract status alerts */}
              
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 group"
          >
            <PlusIcon className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform duration-200" />
            Create Contract
          </button>
        </div>
      </div>

      {showCreateForm && (
        <ContractForm 
          onClose={() => setShowCreateForm(false)}
          onContractCreated={handleContractCreated}
        />
      )}

      {!showCreateForm && (
        <>
          {/* Dashboard Cards */}
          {statistics && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Employees */}
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Employees</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.totalEmployees}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {statistics.employeesWithContracts} with contracts
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Missing Contracts */}
              <div 
                className={`bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-lg transition-all duration-200 ${statistics.employeesWithoutContracts > 0 ? 'cursor-pointer hover:shadow-xl hover:scale-105 border-orange-200 bg-orange-50/50' : ''}`}
                onClick={() => statistics.employeesWithoutContracts > 0 && setActiveFilter(activeFilter === 'missing' ? 'all' : 'missing')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Missing Contracts</p>
                    <p className={`text-3xl font-bold ${statistics.employeesWithoutContracts > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
                      {statistics.employeesWithoutContracts}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {statistics.employeesWithoutContracts > 0 ? 'Click to view list' : 'All employees covered'}
                    </p>
                  </div>
                  <div className={`w-12 h-12 ${statistics.employeesWithoutContracts > 0 ? 'bg-orange-100' : 'bg-gray-100'} rounded-xl flex items-center justify-center`}>
                    <svg className={`w-6 h-6 ${statistics.employeesWithoutContracts > 0 ? 'text-orange-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                {activeFilter === 'missing' && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      Active Filter
                    </span>
                  </div>
                )}
              </div>

              {/* Expiring Contracts */}
              <div 
                className={`bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-lg transition-all duration-200 ${statistics.contractsExpiringThisMonth > 0 ? 'cursor-pointer hover:shadow-xl hover:scale-105 border-amber-200 bg-amber-50/50' : ''}`}
                onClick={() => statistics.contractsExpiringThisMonth > 0 && setActiveFilter(activeFilter === 'expiring' ? 'all' : 'expiring')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Expiring This Month</p>
                    <p className={`text-3xl font-bold ${statistics.contractsExpiringThisMonth > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
                      {statistics.contractsExpiringThisMonth}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {statistics.contractsExpiringThisMonth > 0 ? 'Click to view contracts' : 'No contracts expiring'}
                    </p>
                  </div>
                  <div className={`w-12 h-12 ${statistics.contractsExpiringThisMonth > 0 ? 'bg-amber-100' : 'bg-gray-100'} rounded-xl flex items-center justify-center`}>
                    <svg className={`w-6 h-6 ${statistics.contractsExpiringThisMonth > 0 ? 'text-amber-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                {activeFilter === 'expiring' && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                      Active Filter
                    </span>
                  </div>
                )}
              </div>

              {/* Expired Contracts */}
              <div 
                className={`bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-lg transition-all duration-200 ${statistics.expiredContracts > 0 ? 'cursor-pointer hover:shadow-xl hover:scale-105 border-red-200 bg-red-50/50' : ''}`}
                onClick={() => statistics.expiredContracts > 0 && setActiveFilter(activeFilter === 'expired' ? 'all' : 'expired')}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Expired Contracts</p>
                    <p className={`text-3xl font-bold ${statistics.expiredContracts > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {statistics.expiredContracts}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {statistics.expiredContracts > 0 ? 'Click to view contracts' : 'No expired contracts'}
                    </p>
                  </div>
                  <div className={`w-12 h-12 ${statistics.expiredContracts > 0 ? 'bg-red-100' : 'bg-gray-100'} rounded-xl flex items-center justify-center`}>
                    <svg className={`w-6 h-6 ${statistics.expiredContracts > 0 ? 'text-red-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 0v4m0 0h4m-4 0H8m-2-4a2 2 0 110-4m0 4a2 2 0 110 4m0-8a2 2 0 110-4m0 4a2 2 0 110 4" />
                    </svg>
                  </div>
                </div>
                {activeFilter === 'expired' && (
                  <div className="mt-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Active Filter
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Search and Filters */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-lg">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search contracts by employee, template, or contract person..."
                  className="block w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 bg-white/70 backdrop-blur-sm text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-[#31BCFF]/50 focus:border-[#31BCFF] transition-all duration-200"
                />
              </div>
            </div>
            <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
              <span>
                {activeFilter === 'missing' ? (
                  filteredMissingEmployees.length > 0 
                    ? `Showing ${startIndex + 1} to ${Math.min(endIndex, filteredMissingEmployees.length)} of ${filteredMissingEmployees.length} employees without contracts`
                    : `Showing 0 employees without contracts`
                ) : (
                  filteredContracts.length > 0 
                    ? `Showing ${startIndex + 1} to ${Math.min(endIndex, filteredContracts.length)} of ${filteredContracts.length} contracts`
                    : `Showing 0 of ${contracts.length} contracts`
                )}
              </span>
              {totalPages > 1 && (
                <span className="text-xs text-gray-400">
                  Page {currentPage} of {totalPages}
                </span>
              )}
            </div>
          </div>

          {/* Contracts List or Missing Employees List */}
          {activeFilter === 'missing' ? (
            /* Missing Employees Table */
            filteredMissingEmployees.length === 0 ? (
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-12 border border-gray-200/50 shadow-lg text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  All Employees Have Contracts
                </h3>
                <p className="text-gray-500 mb-6">
                  Every employee in your organization has been assigned a contract.
                </p>
                <button
                  onClick={() => setActiveFilter('all')}
                  className="inline-flex items-center px-6 py-3 rounded-xl bg-[#31BCFF] text-white font-medium hover:bg-[#31BCFF]/90 transition-colors duration-200"
                >
                  View All Contracts
                </button>
              </div>
            ) : (
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/80">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee No.</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200/50">
                      {paginatedMissingEmployees.map((employee) => (
                        <tr key={employee.id} className="hover:bg-orange-50/30 transition-colors duration-200">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {employee.firstName} {employee.lastName}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {employee.employeeNo || (
                                <span className="text-gray-400 italic">No employee number</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{employee.department.name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {employee.employeeGroup?.name || (
                                <span className="text-gray-400 italic">No group assigned</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {employee.email || (
                                <span className="text-gray-400 italic">No email</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setShowCreateForm(true)}
                                className="inline-flex items-center px-3 py-1.5 rounded-lg bg-orange-100 text-orange-800 text-sm font-medium hover:bg-orange-200 transition-colors duration-200"
                                title="Create Contract"
                              >
                                <PlusIcon className="w-4 h-4 mr-1" />
                                Create Contract
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination for Missing Employees */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center px-6 py-4 border-t border-gray-200/50">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                        
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => handlePageChange(page)}
                                  isActive={currentPage === page}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            )
                          } else if (
                            page === currentPage - 2 ||
                            page === currentPage + 2
                          ) {
                            return (
                              <PaginationItem key={page}>
                                <PaginationEllipsis />
                              </PaginationItem>
                            )
                          }
                          return null
                        })}
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </div>
            )
          ) : (
            /* Regular Contracts Table */
            filteredContracts.length === 0 ? (
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-12 border border-gray-200/50 shadow-lg text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DocumentTextIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? 'No contracts found' : 'No contracts yet'}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm 
                    ? 'Try adjusting your search criteria to find what you\'re looking for.'
                    : 'Get started by creating your first employee contract.'
                  }
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="inline-flex items-center px-6 py-3 rounded-xl bg-[#31BCFF] text-white font-medium hover:bg-[#31BCFF]/90 transition-colors duration-200"
                  >
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Create First Contract
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50/80">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Template</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Group</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contract Person</th>
                        <th className="px-6 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200/50">
                      {paginatedContracts.map((contract) => (
                        <tr key={contract.id} className="hover:bg-blue-50/30 transition-colors duration-200">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">
                              {contract.employee.firstName} {contract.employee.lastName}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{contract.contractTemplate.name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{contract.employeeGroup.name}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">{formatDate(contract.startDate)}</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {contract.endDate ? formatDate(contract.endDate) : (
                                <span className="text-gray-400 italic">No end date</span>
                              )}
                              {getExpirationBadge(contract.endDate)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {getSignedStatusBadge(contract.signedStatus)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {contract.contractPerson.firstName} {contract.contractPerson.lastName}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setPreviewContract(contract)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                                title="Preview Contract"
                              >
                                <DocumentTextIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDownload(contract.id, contract)}
                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                                title="Download PDF"
                              >
                                <ArrowDownTrayIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleSign(contract)}
                                className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200"
                                title="Sign Contract"
                              >
                                <PencilSquareIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(contract.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200"
                                title="Delete Contract"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center px-6 py-4 border-t border-gray-200/50">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)}
                            className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                        
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => handlePageChange(page)}
                                  isActive={currentPage === page}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            )
                          } else if (
                            page === currentPage - 2 ||
                            page === currentPage + 2
                          ) {
                            return (
                              <PaginationItem key={page}>
                                <PaginationEllipsis />
                              </PaginationItem>
                            )
                          }
                          return null
                        })}
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)}
                            className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </div>
            )
          )}
        </>
      )}

      {/* Contract Preview Modal */}
      <Dialog open={previewContract !== null} onOpenChange={(open) => !open && setPreviewContract(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Contract Preview</DialogTitle>
          </DialogHeader>
          {previewContract && (
            <div className="space-y-6">
              {/* Template Header */}
              <div className="pb-4 border-b border-gray-200">
                <div className={`flex ${previewContract.contractTemplate.logoPosition === 'TOP_LEFT' ? 'justify-start' : 
                  previewContract.contractTemplate.logoPosition === 'TOP_CENTER' ? 'justify-center' : 'justify-end'} items-center gap-4 mb-4`}>
                  {previewContract.contractTemplate.logoPath && (
                    <img 
                      src={previewContract.contractTemplate.logoPath} 
                      alt="Company Logo" 
                      className="h-16 w-auto"
                      onError={(e) => {
                        console.error('Failed to load logo:', previewContract.contractTemplate.logoPath)
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  )}
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{previewContract.contractTemplate.name}</h2>
              </div>
              
              {/* Contract Body */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="prose prose-sm max-w-none">
                  <div 
                    className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: (formatContractBody(previewContract.contractTemplate.body, previewContract) || '')
                        .replace(/\n/g, '<br>')
                    }}
                  />
                </div>
              </div>
              
              {/* Contract Details */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contract Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-500">Employee:</span>
                    <div className="text-gray-900">
                      {previewContract.employee.firstName} {previewContract.employee.lastName}
                    </div>
                    {previewContract.employee.email && (
                      <div className="text-gray-600">{previewContract.employee.email}</div>
                    )}
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Employee Group:</span>
                    <div className="text-gray-900">{previewContract.employeeGroup.name}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Start Date:</span>
                    <div className="text-gray-900">{formatDate(previewContract.startDate)}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">End Date:</span>
                    <div className="text-gray-900">
                      {previewContract.endDate ? formatDate(previewContract.endDate) : 'Indefinite'}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Contract Person:</span>
                    <div className="text-gray-900">
                      {previewContract.contractPerson.firstName} {previewContract.contractPerson.lastName}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Template:</span>
                    <div className="text-gray-900">{previewContract.contractTemplate.name}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Electronic Signature Modal */}
      <Dialog open={showSignatureForm} onOpenChange={(open) => {
        if (!open) {
          setShowSignatureForm(false);
          setSigningContract(null);
          setSignature('');
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Electronic Signature</DialogTitle>
          </DialogHeader>
          {signingContract && (
            <div className="space-y-6">
              {/* Contract Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Contract Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-500">Employee:</span>
                    <div className="text-gray-900">
                      {signingContract.employee.firstName} {signingContract.employee.lastName}
                    </div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Template:</span>
                    <div className="text-gray-900">{signingContract.contractTemplate.name}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Start Date:</span>
                    <div className="text-gray-900">{formatDate(signingContract.startDate)}</div>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">End Date:</span>
                    <div className="text-gray-900">
                      {signingContract.endDate ? formatDate(signingContract.endDate) : 'Indefinite'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Signature Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Digital Signature *
                </label>
                <input
                  type="text"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="Type your full name here"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-sm text-gray-500 mt-1">
                  This will be your legal signature on the contract.
                </p>
              </div>

              {/* Signature Preview */}
              {signature && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Signature Preview
                  </label>
                  <div className="border border-gray-200 rounded-lg p-6 bg-white">
                    <div 
                      className="text-2xl text-gray-800"
                      style={{ 
                        fontFamily: 'Brush Script MT, cursive',
                        fontStyle: 'italic'
                      }}
                    >
                      {signature}
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      Signed electronically on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              )}

              {/* Terms and Actions */}
              <div className="space-y-4">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-yellow-800">
                        Legal Agreement
                      </h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        By signing this contract electronically, you agree that your electronic signature is the legal equivalent of your manual signature and that you are legally bound by the terms of this contract.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSignatureForm(false);
                      setSigningContract(null);
                      setSignature('');
                    }}
                    className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleElectronicSign}
                    disabled={!signature.trim()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    Sign Contract
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
