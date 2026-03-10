'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DocumentTextIcon,
  PencilSquareIcon,
  CheckCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'
import Swal from 'sweetalert2'

interface Contract {
  id: string
  signedStatus: string | null
  startDate: string
  endDate: string | null
  adminSignedAt: string | null
  employeeSignedAt: string | null
  contractTemplate: {
    id: string
    name: string
    body: string
  }
  adminSignedBy?: {
    firstName: string
    lastName: string
  } | null
}

interface PendingContractsCardProps {
  onSignContract?: (contractId: string) => void
}

export default function PendingContractsCard({ onSignContract }: PendingContractsCardProps) {
  const { t } = useTranslation('employee-dashboard')
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [signingContractId, setSigningContractId] = useState<string | null>(null)

  useEffect(() => {
    fetchContracts()
  }, [])

  const fetchContracts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/employee/contracts')
      const data = await response.json()
      if (response.ok) {
        setContracts(data.pendingSignature || [])
      }
    } catch (error) {
      console.error('Error fetching contracts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignContract = async (contract: Contract) => {
    const result = await Swal.fire({
      title: t('contracts.signTitle', 'Sign Contract'),
      html: `
        <div class="text-left">
          <p class="mb-4">${t('contracts.signConfirmMessage', 'You are about to sign the following contract:')}</p>
          <p class="font-semibold">${contract.contractTemplate.name}</p>
          <p class="text-sm text-gray-500 mt-2">${t('contracts.signedByAdmin', 'Signed by')}: ${contract.adminSignedBy?.firstName} ${contract.adminSignedBy?.lastName}</p>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#31BCFF',
      confirmButtonText: t('contracts.signButton', 'Sign Contract'),
      cancelButtonText: t('cancel', 'Cancel'),
    })

    if (!result.isConfirmed) return

    try {
      setSigningContractId(contract.id)
      const response = await fetch(`/api/contracts/${contract.id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signingType: 'ELECTRONIC',
          signerRole: 'employee',
        }),
      })

      if (response.ok) {
        await fetchContracts()
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          icon: 'success',
          title: t('contracts.signedSuccess', 'Contract signed successfully'),
        })
        onSignContract?.(contract.id)
      } else {
        const data = await response.json()
        Swal.fire({
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          icon: 'error',
          title: data.error || t('contracts.signFailed', 'Failed to sign contract'),
        })
      }
    } catch (error) {
      console.error('Error signing contract:', error)
    } finally {
      setSigningContractId(null)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (contracts.length === 0) {
    return null
  }

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl shadow-lg border border-amber-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-amber-100 rounded-xl">
          <DocumentTextIcon className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {t('contracts.pendingSignature', 'Contracts Pending Your Signature')}
          </h3>
          <p className="text-sm text-gray-500">
            {t('contracts.pendingCount', '{{count}} contract(s) require your signature', { count: contracts.length })}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {contracts.map((contract) => (
          <div
            key={contract.id}
            className="bg-white rounded-xl p-4 border border-amber-100 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <DocumentTextIcon className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{contract.contractTemplate.name}</p>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <CheckCircleIcon className="w-4 h-4 text-green-500" />
                  <span>
                    {t('contracts.adminSigned', 'Signed by {{name}}', {
                      name: `${contract.adminSignedBy?.firstName || ''} ${contract.adminSignedBy?.lastName || ''}`.trim() || 'Admin'
                    })}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => handleSignContract(contract)}
              disabled={signingContractId === contract.id}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#31BCFF] to-[#0EA5E9] text-white font-medium rounded-xl hover:from-[#31BCFF]/90 hover:to-[#0EA5E9]/90 transition-all disabled:opacity-50"
            >
              {signingContractId === contract.id ? (
                <>
                  <ClockIcon className="w-4 h-4 animate-spin" />
                  {t('contracts.signing', 'Signing...')}
                </>
              ) : (
                <>
                  <PencilSquareIcon className="w-4 h-4" />
                  {t('contracts.sign', 'Sign')}
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
