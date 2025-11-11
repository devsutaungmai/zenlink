import React from 'react'

interface ShiftExchangeInfoProps {
  shift: {
    id: string
    approved: boolean
    shiftExchanges?: Array<{
      id: string
      status: string
      fromEmployee: {
        firstName: string
        lastName: string
        department: {
          name: string
        }
      }
      toEmployee: {
        firstName: string
        lastName: string
        department: {
          name: string
        }
      }
    }>
    employee?: {
      firstName: string
      lastName: string
      department?: {
        name: string
      }
    }
  }
}

export default function ShiftExchangeInfo({ shift }: ShiftExchangeInfoProps) {
  // Only show exchange info if shift is approved and has approved exchanges
  const approvedExchange = shift.shiftExchanges?.find(exchange => exchange.status === 'APPROVED')
  
  if (!shift.approved || !approvedExchange) {
    return null
  }

  return (
    <div className="mt-1 p-1.5 bg-blue-50 rounded border border-blue-200">
      <div className="text-[10px] font-semibold text-blue-700 mb-1">
        Exchange Approved
      </div>
      
      <div className="text-[10px] text-blue-700 space-y-0.5">
        <div>
          <span className="font-medium">Current:</span>{' '}
          <span>
            {shift.employee?.firstName} {shift.employee?.lastName}
            {shift.employee?.department && (
              <span className="text-blue-600"> ({shift.employee.department.name})</span>
            )}
          </span>
        </div>
        
        <div>
          <span className="font-medium">Originally assigned to:</span>{' '}
          <span>
            {approvedExchange.fromEmployee.firstName} {approvedExchange.fromEmployee.lastName}
            <span className="text-blue-600"> ({approvedExchange.fromEmployee.department.name})</span>
          </span>
        </div>
      </div>
    </div>
  )
}
