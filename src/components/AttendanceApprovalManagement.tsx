'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'

interface AttendanceRecord {
  id: string
  punchInTime: string
  punchOutTime: string | null
  approved: boolean
  duration: number
  employee: {
    id: string
    firstName: string
    lastName: string
    employeeNo?: string
  }
  shift?: {
    id: string
    startTime: string
    endTime: string | null
    date: string
  }
}

export default function AttendanceApprovalManagement() {
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedAttendances, setSelectedAttendances] = useState<string[]>([])
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('pending')
  const [dateRange, setDateRange] = useState({
    startDate: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd')
  })

  const fetchAttendances = async () => {
    setLoading(true)
    try {
      const startIso = new Date(`${dateRange.startDate}T00:00:00`).toISOString()
      const endIso = new Date(`${dateRange.endDate}T23:59:59.999`).toISOString()
      const params = new URLSearchParams({
        startDate: startIso,
        endDate: endIso
      })

      if (filter !== 'all') {
        params.append('approved', filter === 'approved' ? 'true' : 'false')
      }

      const response = await fetch(`/api/attendance?${params}`)
      const data = await response.json()

      if (response.ok) {
        // Calculate duration for records that have punch out time
        const attendancesWithDuration = data.map((attendance: any) => ({
          ...attendance,
          duration: attendance.punchOutTime
            ? (new Date(attendance.punchOutTime).getTime() - new Date(attendance.punchInTime).getTime()) / (1000 * 60 * 60)
            : 0
        }))
        setAttendances(attendancesWithDuration)
      } else {
        console.error('Failed to fetch attendances:', data.error)
      }
    } catch (error) {
      console.error('Error fetching attendances:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAttendances()
  }, [filter, dateRange])

  const handleBulkApproval = async (approved: boolean) => {
    if (selectedAttendances.length === 0) {
      alert('Please select attendance records to update')
      return
    }

    try {
      const response = await fetch('/api/attendance', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attendanceIds: selectedAttendances,
          approved
        })
      })

      const data = await response.json()

      if (response.ok) {
        alert(data.message)
        setSelectedAttendances([])
        fetchAttendances()
      } else {
        alert(data.error)
      }
    } catch (error) {
      console.error('Error updating attendance:', error)
      alert('Failed to update attendance records')
    }
  }

  const toggleSelection = (attendanceId: string) => {
    setSelectedAttendances(prev =>
      prev.includes(attendanceId)
        ? prev.filter(id => id !== attendanceId)
        : [...prev, attendanceId]
    )
  }

  const toggleSelectAll = () => {
    if (selectedAttendances.length === attendances.length) {
      setSelectedAttendances([])
    } else {
      setSelectedAttendances(attendances.map(a => a.id))
    }
  }

  const getStatusBadge = (approved: boolean) => {
    return (
      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
        approved 
          ? 'bg-green-100 text-green-800 border border-green-200' 
          : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
      }`}>
        {approved ? 'Approved' : 'Pending'}
      </span>
    )
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200/50">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Attendance Approval Management</h1>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status Filter
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as 'all' | 'pending' | 'approved')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Records</option>
                <option value="pending">Pending Approval</option>
                <option value="approved">Approved</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedAttendances.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">
                  {selectedAttendances.length} records selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleBulkApproval(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                  >
                    Approve Selected
                  </button>
                  <button
                    onClick={() => handleBulkApproval(false)}
                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm font-medium"
                  >
                    Unapprove Selected
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : attendances.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedAttendances.length === attendances.length && attendances.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Scheduled Shift
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {attendances.map((attendance) => (
                  <tr key={attendance.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedAttendances.includes(attendance.id)}
                        onChange={() => toggleSelection(attendance.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {attendance.employee.firstName} {attendance.employee.lastName}
                        </div>
                        {attendance.employee.employeeNo && (
                          <div className="text-sm text-gray-500">
                            #{attendance.employee.employeeNo}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm text-gray-900">
                          {format(new Date(attendance.punchInTime), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-sm text-gray-500">
                          {format(new Date(attendance.punchInTime), 'HH:mm')} - 
                          {attendance.punchOutTime 
                            ? format(new Date(attendance.punchOutTime), 'HH:mm')
                            : 'Still clocked in'
                          }
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {attendance.punchOutTime ? `${attendance.duration.toFixed(2)}h` : 'In progress'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {attendance.shift ? (
                        <div className="text-sm text-gray-900">
                          {attendance.shift.startTime} - {attendance.shift.endTime || 'Open'}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 italic">No scheduled shift</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(attendance.approved)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-500">No attendance records found for the selected criteria</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
