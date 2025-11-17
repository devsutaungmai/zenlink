import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

export function WeekViewSkeleton() {
  return (
    <div className="space-y-0">
      {/* Header Section - Matches schedule page structure */}
      <div className="bg-white border-b px-4 sm:px-6 lg:px-8 py-3 md:py-4">
        {/* Mobile Header Skeleton */}
        <div className="md:hidden space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton width="60%" height={40} borderRadius={8} />
            <Skeleton width={80} height={40} borderRadius={8} />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton width={60} height={36} borderRadius={6} />
            <div className="flex items-center gap-2">
              <Skeleton circle width={36} height={36} />
              <Skeleton width={140} height={20} />
              <Skeleton circle width={36} height={36} />
            </div>
          </div>
        </div>

        {/* Desktop Header Skeleton */}
        <div className="hidden md:flex items-center gap-3">
          <Skeleton width={150} height={40} borderRadius={8} />
          <Skeleton width={60} height={36} borderRadius={6} />
          <div className="flex items-center gap-2">
            <Skeleton circle width={36} height={36} />
            <Skeleton width={200} height={20} />
            <Skeleton circle width={36} height={36} />
          </div>
          <div className="flex-1"></div>
          <div className="flex items-center gap-2">
            <Skeleton circle width={36} height={36} />
            <Skeleton circle width={36} height={36} />
            <Skeleton width={80} height={36} borderRadius={6} />
          </div>
        </div>
      </div>

      {/* View Type Tabs */}
      <div className="bg-white border-b px-4 sm:px-6 lg:px-8">
        <div className="flex gap-0 md:gap-1 -mb-px overflow-x-auto">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="px-3 md:px-4 py-2.5 md:py-3">
              <Skeleton width={80} height={16} />
            </div>
          ))}
        </div>
      </div>

      {/* Main content area - Matches schedule page structure */}
      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Mobile: Vertical Day Cards */}
          <div className="md:hidden space-y-3 p-4">
            {Array(7).fill(0).map((_, dayIndex) => (
              <div key={dayIndex} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-3">
                  <Skeleton width={80} height={16} />
                  <Skeleton width={40} height={14} />
                </div>
                <div className="space-y-2">
                  {Array(Math.floor(Math.random() * 3) + 1).fill(0).map((_, shiftIndex) => (
                    <Skeleton key={shiftIndex} height={50} borderRadius={8} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: Grid Layout */}
          <div className="hidden md:block">
            {/* Header */}
            <div className="grid grid-cols-8 border-b bg-gray-50">
              <div className="p-3 border-r">
                <Skeleton width={80} />
              </div>
              {Array(7).fill(0).map((_, i) => (
                <div key={i} className="p-3 border-r last:border-r-0">
                  <Skeleton width={60} />
                  <Skeleton width={40} className="mt-1" />
                </div>
              ))}
            </div>

            {/* Rows */}
            {Array(8).fill(0).map((_, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-8 border-b last:border-b-0">
                <div className="p-3 border-r bg-gray-50">
                  <Skeleton width={100} />
                </div>
                {Array(7).fill(0).map((_, colIndex) => (
                  <div key={colIndex} className="p-3 border-r last:border-r-0 min-h-[80px]">
                    {Math.random() > 0.5 && (
                      <div className="space-y-2">
                        <Skeleton height={60} borderRadius={8} />
                        {Math.random() > 0.6 && <Skeleton height={60} borderRadius={8} />}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

export function EmployeeGroupedViewSkeleton() {
  return (
    <div className="space-y-4">
      {Array(4).fill(0).map((_, groupIndex) => (
        <div key={groupIndex} className="bg-white rounded-lg shadow overflow-hidden">
          {/* Group Header */}
          <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-3">
            <Skeleton circle width={20} height={20} />
            <Skeleton width={150} />
            <Skeleton width={60} className="ml-auto" />
          </div>

          {/* Mobile: Employee Cards - Exact Layout Match */}
          <div className="md:hidden divide-y">
            {Array(3).fill(0).map((_, empIndex) => (
              <div key={empIndex} className="bg-white">
                {/* Employee Header */}
                <div className="flex items-center justify-between p-3 border-b">
                  <div className="flex items-center gap-3">
                    <Skeleton circle width={32} height={32} />
                    <div>
                      <Skeleton width={120} height={16} />
                      <Skeleton width={80} height={12} className="mt-1" />
                    </div>
                  </div>
                  <Skeleton width={20} height={20} />
                </div>

                {/* Day Grid - Exactly 7 columns matching header */}
                <div className="grid grid-cols-7 gap-0 p-3">
                  {Array(7).fill(0).map((_, dayIndex) => (
                    <div key={dayIndex} className="px-1">
                      <div className="aspect-square">
                        {Math.random() > 0.5 ? (
                          <Skeleton height="100%" borderRadius={12} />
                        ) : (
                          <div className="w-full h-full border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center">
                            <Skeleton circle width={24} height={24} />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: Grid Layout - Exact Match */}
          <div className="hidden md:block overflow-auto">
            <div className="min-w-full">
              {/* Header Row */}
              <div className="grid grid-cols-[1fr_repeat(7,minmax(140px,1fr))] border-b bg-gray-50 sticky top-0">
                <div className="p-3 border-r"></div>
                {Array(7).fill(0).map((_, i) => (
                  <div key={i} className="p-3 border-r last:border-r-0 text-center">
                    <Skeleton width={60} height={16} />
                    <Skeleton width={40} height={12} className="mt-1" />
                  </div>
                ))}
              </div>

              {/* Employee Rows */}
              {Array(3).fill(0).map((_, empIndex) => (
                <div key={empIndex} className="grid grid-cols-[1fr_repeat(7,minmax(140px,1fr))] border-b last:border-b-0">
                  <div className="p-3 border-r bg-gray-50 flex items-center gap-2">
                    <Skeleton circle width={24} height={24} />
                    <div>
                      <Skeleton width={100} height={16} />
                      <Skeleton width={60} height={12} className="mt-1" />
                    </div>
                  </div>
                  {Array(7).fill(0).map((_, dayIndex) => (
                    <div key={dayIndex} className="p-3 border-r last:border-r-0 min-h-[80px]">
                      {Math.random() > 0.4 && (
                        <Skeleton height={60} borderRadius={8} />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function GroupGroupedViewSkeleton() {
  return <EmployeeGroupedViewSkeleton />
}

export function FunctionGroupedViewSkeleton() {
  return (
    <div className="overflow-hidden">
      {/* Mobile View - Grid Layout */}
      <div className="md:hidden bg-gray-50">
        {/* Week Days Header - Perfectly aligned with grid */}
        <div className="bg-white sticky top-0 z-10 border-b shadow-sm">
          <div className="grid grid-cols-7 gap-0">
            {Array(7).fill(0).map((_, i) => (
              <div key={i} className="text-center py-3 border-r last:border-r-0">
                <Skeleton width={30} height={12} className="mb-1" />
                <Skeleton width={20} height={24} />
              </div>
            ))}
          </div>
        </div>

        {/* Function Rows */}
        <div className="p-3 space-y-3">
          {Array(4).fill(0).map((_, fnIndex) => (
            <div key={fnIndex} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              {/* Function Header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b bg-gray-50">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  <Skeleton circle width={36} height={36} />
                  <div className="flex-1 min-w-0">
                    <Skeleton width={120} height={16} className="mb-1" />
                    <Skeleton width={180} height={12} />
                  </div>
                </div>
                <Skeleton width={20} height={20} />
              </div>

              {/* Day Grid - Exactly 7 columns matching header */}
              <div className="grid grid-cols-7 gap-0 p-3">
                {Array(7).fill(0).map((_, dayIndex) => (
                  <div key={dayIndex} className="px-1">
                    <div className="aspect-square">
                      {Math.random() > 0.5 ? (
                        <Skeleton height="100%" borderRadius={12} />
                      ) : (
                        <div className="w-full h-full border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center">
                          <Skeleton circle width={24} height={24} />
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop View - Same as EmployeeGroupedView structure */}
      <div className="hidden md:block overflow-auto">
        <div className="min-w-full">
          {/* Header Row */}
          <div className="grid grid-cols-[1fr_repeat(7,minmax(140px,1fr))] border-b bg-gray-50 sticky top-0">
            <div className="p-3 border-r"></div>
            {Array(7).fill(0).map((_, i) => (
              <div key={i} className="p-3 border-r last:border-r-0 text-center">
                <Skeleton width={60} height={16} />
                <Skeleton width={40} height={12} className="mt-1" />
              </div>
            ))}
          </div>

          {/* Function Rows */}
          {Array(4).fill(0).map((_, fnIndex) => (
            <div key={fnIndex} className="grid grid-cols-[1fr_repeat(7,minmax(140px,1fr))] border-b last:border-b-0">
              <div className="p-3 border-r bg-gray-50 flex items-center gap-2">
                <Skeleton circle width={24} height={24} />
                <div>
                  <Skeleton width={100} height={16} />
                  <Skeleton width={60} height={12} className="mt-1" />
                </div>
              </div>
              {Array(7).fill(0).map((_, dayIndex) => (
                <div key={dayIndex} className="p-3 border-r last:border-r-0 min-h-[80px]">
                  {Math.random() > 0.4 && (
                    <Skeleton height={60} borderRadius={8} />
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function TableSkeleton({ rows = 10, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {Array(columns).fill(0).map((_, i) => (
              <th key={i} className="px-6 py-3">
                <Skeleton width={100} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array(rows).fill(0).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array(columns).fill(0).map((_, colIndex) => (
                <td key={colIndex} className="px-6 py-4">
                  <Skeleton width={colIndex === 0 ? 150 : 80} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CardGridSkeleton({ count = 9 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array(count).fill(0).map((_, i) => (
        <div key={i} className="group bg-white/80 backdrop-blur-xl rounded-2xl p-6 border border-gray-200/50 shadow-lg">
          {/* Header with Color Indicator */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Skeleton circle width={12} height={12} />
                <Skeleton width={140} height={20} />
              </div>
              <Skeleton width={80} height={16} borderRadius={12} />
              <Skeleton width={120} height={14} className="mt-1" />
            </div>
            <div className="flex items-center space-x-2">
              <Skeleton circle width={32} height={32} />
            </div>
          </div>

          {/* Stats Section */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Skeleton width={60} height={14} className="mb-1" />
                <Skeleton width={40} height={28} />
              </div>
              <div>
                <Skeleton width={50} height={14} className="mb-1" />
                <Skeleton width={35} height={28} />
              </div>
            </div>
          </div>

          {/* Quick Action Button */}
          <div className="mt-4 pt-4 border-t border-gray-200/50">
            <Skeleton width="100%" height={40} borderRadius={12} />
          </div>
        </div>
      ))}
    </div>
  )
}
