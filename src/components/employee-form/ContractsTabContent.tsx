import React, { useState } from 'react'
import { DocumentDuplicateIcon, EyeIcon, ArrowDownTrayIcon, CheckCircleIcon, XCircleIcon, ClockIcon, XMarkIcon } from '@heroicons/react/24/outline'
import { downloadBlob } from '@/shared/utils/download'

interface Contract {
  id: string
  startDate: string
  endDate: string | null
  signedStatus: string
  signedAt: string | null
  contractTemplate: {
    name: string
  }
  employeeGroup: {
    name: string
  }
}

interface ContractsTabContentProps {
  contracts?: Contract[]
  employeeName?: string
  isNewEmployee?: boolean
  loading?: boolean
  onCreateContract?: () => void
}

export function ContractsTabContent({ 
  contracts, 
  employeeName, 
  isNewEmployee,
  loading,
  onCreateContract
}: ContractsTabContentProps) {
  const [downloading, setDownloading] = useState<string | null>(null)
  const [viewingContract, setViewingContract] = useState<Contract | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const handleDownload = async (contract: Contract) => {
    try {
      setDownloading(contract.id)
      
      const downloadUrl = `/api/contracts/${contract.id}/download`
      const response = await fetch(downloadUrl)
      
      if (!response.ok) {
        throw new Error('Failed to generate PDF')
      }

      const contentDisposition = response.headers.get('content-disposition')
      let filename = `${contract.contractTemplate.name}_Contract.pdf`
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/)
        if (filenameMatch) {
          filename = filenameMatch[1]
        }
      }

      const blob = await response.blob()
      downloadBlob(blob, filename)
    } catch (error) {
      console.error('Error downloading contract:', error)
      alert('Failed to download contract. Please try again.')
    } finally {
      setDownloading(null)
    }
  }

  const handleView = async (contract: Contract) => {
    try {
      setViewingContract(contract)
      setPreviewLoading(true)
      
      const response = await fetch(`/api/contracts/${contract.id}/download`)
      
      if (!response.ok) {
        throw new Error('Failed to load contract preview')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      setPreviewUrl(url)
    } catch (error) {
      console.error('Error viewing contract:', error)
      alert('Failed to load contract preview. Please try again.')
      setViewingContract(null)
    } finally {
      setPreviewLoading(false)
    }
  }

  const closePreview = () => {
    if (previewUrl) {
      window.URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    setViewingContract(null)
  }
  
  if (isNewEmployee) {
    return (
      <div className="bg-gray-50 rounded-xl p-8 text-center">
        <DocumentDuplicateIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h4 className="text-lg font-medium text-gray-900 mb-2">No Contracts Yet</h4>
        <p className="text-gray-500">
          Contracts will be available after the employee is created.
        </p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#31BCFF]"></div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SIGNED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
            <CheckCircleIcon className="w-3 h-3" />
            Signed
          </span>
        )
      case 'UNSIGNED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-800">
            <ClockIcon className="w-3 h-3" />
            Unsigned
          </span>
        )
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
            <XCircleIcon className="w-3 h-3" />
            Expired
          </span>
        )
      default:
        return (
          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">
            {status}
          </span>
        )
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const isActive = (contract: Contract) => {
    const now = new Date()
    const start = new Date(contract.startDate)
    const end = contract.endDate ? new Date(contract.endDate) : null
    
    if (end) {
      return now >= start && now <= end
    }
    return now >= start
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Employee Contracts</h3>
          <div className="text-sm text-gray-500">
            {employeeName && `Contracts for ${employeeName}`}
          </div>
        </div>
        {onCreateContract && !isNewEmployee && (
          <button
            onClick={onCreateContract}
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-[#31BCFF] text-white text-sm font-medium shadow hover:bg-[#31BCFF]/90 transition-colors"
          >
            Create Contract
          </button>
        )}
      </div>

      {!contracts || contracts.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-8 text-center">
          <DocumentDuplicateIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Contracts Found</h4>
          <p className="text-gray-500">
            This employee has no contracts assigned yet.
          </p>
          {onCreateContract && !isNewEmployee && (
            <button
              onClick={onCreateContract}
              className="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#31BCFF] text-white text-sm font-medium hover:bg-[#31BCFF]/90"
            >
              Create Contract
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((contract) => (
            <div 
              key={contract.id} 
              className={`bg-white rounded-xl p-6 border shadow-sm transition-all duration-200 hover:shadow-md ${
                isActive(contract) ? 'border-[#31BCFF] bg-blue-50/30' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <DocumentDuplicateIcon className={`w-6 h-6 ${isActive(contract) ? 'text-[#31BCFF]' : 'text-gray-400'}`} />
                    <div>
                      <h4 className="font-semibold text-gray-900 text-lg">
                        {contract.contractTemplate.name}
                      </h4>
                      {isActive(contract) && (
                        <span className="text-xs text-[#31BCFF] font-medium">Active Contract</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Start Date</p>
                      <p className="text-sm font-medium text-gray-900">{formatDate(contract.startDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">End Date</p>
                      <p className="text-sm font-medium text-gray-900">
                        {contract.endDate ? formatDate(contract.endDate) : 'Ongoing'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Employee Group</p>
                      <p className="text-sm font-medium text-gray-900">{contract.employeeGroup.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Status</p>
                      <div>{getStatusBadge(contract.signedStatus || 'UNSIGNED')}</div>
                    </div>
                  </div>

                  {contract.signedAt && (
                    <div className="text-xs text-gray-500 mb-3">
                      Signed on {formatDate(contract.signedAt)}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  <button 
                    onClick={() => handleView(contract)}
                    disabled={previewLoading && viewingContract?.id === contract.id}
                    className="p-2 text-gray-400 hover:text-[#31BCFF] hover:bg-blue-50 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="View Contract"
                  >
                    {previewLoading && viewingContract?.id === contract.id ? (
                      <div className="w-5 h-5 border-2 border-[#31BCFF] border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                  <button 
                    onClick={() => handleDownload(contract)}
                    disabled={downloading === contract.id}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Download Contract"
                  >
                    {downloading === contract.id ? (
                      <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <ArrowDownTrayIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewingContract && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closePreview}>
          <div className="bg-white rounded-xl w-full max-w-5xl h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{viewingContract.contractTemplate.name}</h3>
                <p className="text-sm text-gray-500">{employeeName}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(viewingContract)}
                  disabled={downloading === viewingContract.id}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {downloading === viewingContract.id ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Downloading...
                    </>
                  ) : (
                    <>
                      <ArrowDownTrayIcon className="w-5 h-5" />
                      Download
                    </>
                  )}
                </button>
                <button
                  onClick={closePreview}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Close"
                >
                  <XMarkIcon className="w-6 h-6 text-gray-600" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden">
              {previewLoading ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 border-4 border-[#31BCFF] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading contract preview...</p>
                  </div>
                </div>
              ) : previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full"
                  title="Contract Preview"
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-500">Failed to load preview</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
