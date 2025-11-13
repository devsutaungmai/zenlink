import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

export function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-6 sm:p-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Skeleton circle width={80} height={80} />
            <div className="flex-1">
              <Skeleton width={200} height={32} className="mb-2" />
              <Skeleton width={150} height={20} />
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-6">
            {Array(5).fill(0).map((_, i) => (
              <div key={i}>
                <Skeleton width={120} height={20} className="mb-2" />
                <Skeleton height={40} borderRadius={8} />
              </div>
            ))}
          </div>

          {/* Buttons */}
          <div className="mt-8 flex gap-4">
            <Skeleton width={120} height={44} borderRadius={8} />
            <Skeleton width={120} height={44} borderRadius={8} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function FormSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 sm:p-8">
      <Skeleton width={200} height={32} className="mb-6" />
      
      <div className="space-y-6">
        {Array(rows).fill(0).map((_, i) => (
          <div key={i}>
            <Skeleton width={120} height={20} className="mb-2" />
            <Skeleton height={44} borderRadius={8} />
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-4">
        <Skeleton width={120} height={44} borderRadius={8} />
        <Skeleton width={100} height={44} borderRadius={8} />
      </div>
    </div>
  )
}

export function DashboardStatsSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton circle width={48} height={48} />
              <Skeleton width={60} height={24} />
            </div>
            <Skeleton width={100} height={36} className="mb-2" />
            <Skeleton width={150} height={20} />
          </div>
        ))}
      </div>

      {/* Charts/Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow p-6">
          <Skeleton width={180} height={28} className="mb-6" />
          <Skeleton height={300} />
        </div>
        <div className="bg-white rounded-xl shadow p-6">
          <Skeleton width={180} height={28} className="mb-6" />
          <Skeleton height={300} />
        </div>
      </div>
    </div>
  )
}

export function ListSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="divide-y divide-gray-200">
        {Array(count).fill(0).map((_, i) => (
          <div key={i} className="p-4 sm:p-6 flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <Skeleton circle width={48} height={48} />
              <div className="flex-1">
                <Skeleton width={200} height={20} className="mb-2" />
                <Skeleton width={150} height={16} />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton width={80} height={36} borderRadius={8} />
              <Skeleton width={80} height={36} borderRadius={8} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function DetailPageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton width={250} height={32} />
          <div className="flex gap-2">
            <Skeleton width={100} height={40} borderRadius={8} />
            <Skeleton width={100} height={40} borderRadius={8} />
          </div>
        </div>
        <Skeleton count={2} className="mb-2" />
      </div>

      {/* Content Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b px-6 py-4">
          <div className="flex gap-4">
            {Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} width={100} height={36} borderRadius={8} />
            ))}
          </div>
        </div>
        
        <div className="p-6 space-y-4">
          {Array(6).fill(0).map((_, i) => (
            <div key={i} className="flex items-start gap-4">
              <Skeleton width={150} height={20} />
              <Skeleton width={250} height={20} className="flex-1" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function PunchClockSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6">
        <Skeleton width={200} height={32} className="mb-2" />
        <Skeleton width={300} height={20} />
      </div>

      {/* Clock Card */}
      <div className="bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <Skeleton width={200} height={60} className="mx-auto mb-4" />
          <Skeleton width={150} height={24} className="mx-auto" />
        </div>
        
        <div className="flex justify-center gap-4">
          <Skeleton width={150} height={56} borderRadius={12} />
          <Skeleton width={150} height={56} borderRadius={12} />
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b">
          <Skeleton width={180} height={28} />
        </div>
        <div className="divide-y">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between">
              <div className="flex-1 space-y-2">
                <Skeleton width={120} height={20} />
                <Skeleton width={180} height={16} />
              </div>
              <Skeleton width={100} height={32} borderRadius={8} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function PayrollSkeleton() {
  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Skeleton width={100} height={20} className="mb-2" />
            <Skeleton height={44} borderRadius={8} />
          </div>
          <div>
            <Skeleton width={100} height={20} className="mb-2" />
            <Skeleton height={44} borderRadius={8} />
          </div>
          <div>
            <Skeleton width={100} height={20} className="mb-2" />
            <Skeleton height={44} borderRadius={8} />
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6">
            <Skeleton width={120} height={20} className="mb-3" />
            <Skeleton width={150} height={40} />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              {Array(6).fill(0).map((_, i) => (
                <th key={i} className="px-6 py-3">
                  <Skeleton width={80} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array(8).fill(0).map((_, rowIndex) => (
              <tr key={rowIndex} className="border-t">
                {Array(6).fill(0).map((_, colIndex) => (
                  <td key={colIndex} className="px-6 py-4">
                    <Skeleton width={colIndex === 0 ? 120 : 60} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
