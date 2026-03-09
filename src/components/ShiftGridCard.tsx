import React from "react"
import { Shift } from '@prisma/client'

// Extended Shift type to include relations
type ShiftWithRelations = Shift & {
  employee?: {
    firstName: string
    lastName: string
    department?: {
      name: string
    }
  }
  employeeGroup?: {
    name: string
  }
  shiftExchanges?: Array<{
    id: string
    status: string
    fromEmployee: {
      id: string
      firstName: string
      lastName: string
      department: {
        name: string
      }
    }
    toEmployee: {
      id: string
      firstName: string
      lastName: string
      department: {
        name: string
      }
    }
  }>
}

interface ShiftGridCardProps {
  shift: ShiftWithRelations
  employeeId: string
  employees?: Array<{
    id: string
    firstName: string
    lastName: string
  }>
  onApprove: (shiftId: string) => void
  onPublish?: (shiftId: string) => void
  onEdit: (shift: ShiftWithRelations) => void
  onDragStart: (e: React.DragEvent, shift: ShiftWithRelations, employeeId: string) => void
  onDragEnd: (e: React.DragEvent) => void
}

export default function ShiftGridCard({
  shift,
  employeeId,
  employees = [],
  onApprove,
  onPublish,
  onEdit,
  onDragStart,
  onDragEnd,
}: ShiftGridCardProps) {
  const isDraft = !(shift as any).isPublished
  // Check if there's an approved exchange to determine the current assigned employee
  const approvedExchange = shift.shiftExchanges?.find(exchange => exchange.status === 'APPROVED')
  
  // If there's an approved exchange, show the toEmployee, otherwise show the original employee
  let currentEmployee = null
  if (approvedExchange) {
    currentEmployee = employees.find(e => e.id === approvedExchange.toEmployee.id) || {
      firstName: approvedExchange.toEmployee.firstName,
      lastName: approvedExchange.toEmployee.lastName
    }
  } else {
    currentEmployee = employees.find(e => e.id === shift.employeeId) || shift.employee
  }

  return (
    <div
      className={`relative rounded-lg border shadow-md bg-white px-3 py-2 text-sm transition group cursor-grab
        ${shift.approved
          ? "border-green-300 bg-green-50 text-green-900"
          : isDraft
            ? "border-gray-200 bg-gray-100 text-gray-500"
            : "border-gray-300 bg-gray-50 text-gray-900"}
        hover:shadow-lg`}
      draggable
      onDragStart={e => onDragStart(e, shift, employeeId)}
      onDragEnd={onDragEnd}
      onClick={() => window.location.href = `/dashboard/shifts/${shift.id}/edit`}
      style={{ fontSize: '12px', lineHeight: '16px', minWidth: 0 }}
    >
      {/* Shift Details */}
      <div className="font-semibold truncate">
        {shift.startTime.substring(0, 5)} - {shift.endTime ? shift.endTime.substring(0, 5) : 'Active'}
      </div>
      {currentEmployee && (
        <div className="text-xs mt-1 truncate font-medium">
          {currentEmployee.firstName} {currentEmployee.lastName}
        </div>
      )}
      {shift.employeeGroup && (
        <div className="text-xs mt-1 opacity-75 truncate">{shift.employeeGroup.name}</div>
      )}
      <div className="text-xs mt-1">
        {shift.approved ? (
          <span className="inline-flex items-center gap-1 text-green-700">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Payroll Approved
          </span>
        ) : isDraft ? (
          <span className="inline-flex items-center gap-1 text-gray-500">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" />
            </svg>
            Draft
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-blue-600">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
            </svg>
            Published
          </span>
        )}
      </div>

      {/* Mini Actions - vertical stack */}
      <div className="absolute top-1 right-1 flex flex-col items-center space-y-1 opacity-0 group-hover:opacity-100 transition">
        {isDraft && onPublish && (
          <button
            onClick={e => {
              e.stopPropagation();
              onPublish(shift.id);
            }}
            className="text-blue-600 hover:text-blue-800"
            title="Publish Shift"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        )}
        {!isDraft && !shift.approved && (
          <button
            onClick={e => {
              e.stopPropagation();
              onApprove(shift.id);
            }}
            className="text-green-600 hover:text-green-800"
            title="Approve for Payroll"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </button>
        )}
        <button
          onClick={e => {
            e.stopPropagation();
            onEdit(shift);
          }}
          className="text-blue-600 hover:text-blue-800"
          title="Edit Shift"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.862 3.487a2.25 2.25 0 113.182 3.182L6.75 19.964l-4.5.75.75-4.5 13.862-13.727z"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}