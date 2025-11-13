import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'

export function WeekViewSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-8 border-b">
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
          <div className="p-3 border-r">
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
  )
}

export function EmployeeGroupedViewSkeleton() {
  return (
    <div className="space-y-4">
      {Array(6).fill(0).map((_, groupIndex) => (
        <div key={groupIndex} className="bg-white rounded-lg shadow overflow-hidden">
          {/* Group Header */}
          <div className="bg-gray-50 px-4 py-3 border-b flex items-center gap-3">
            <Skeleton width={20} height={20} />
            <Skeleton width={150} />
            <Skeleton width={60} className="ml-auto" />
          </div>

          {/* Employee Rows */}
          <div className="divide-y">
            {Array(3).fill(0).map((_, empIndex) => (
              <div key={empIndex} className="grid grid-cols-8">
                <div className="p-3 border-r bg-gray-50">
                  <Skeleton width={120} />
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
      ))}
    </div>
  )
}

export function GroupGroupedViewSkeleton() {
  return <EmployeeGroupedViewSkeleton />
}

export function FunctionGroupedViewSkeleton() {
  return (
    <div className="space-y-4">
      {Array(5).fill(0).map((_, catIndex) => (
        <div key={catIndex} className="bg-white rounded-lg shadow overflow-hidden">
          {/* Category Header */}
          <div className="px-4 py-3 border-b flex items-center gap-3">
            <Skeleton circle width={24} height={24} />
            <Skeleton width={180} />
            <Skeleton width={70} className="ml-auto" />
          </div>

          {/* Function Rows */}
          <div className="divide-y">
            {Array(4).fill(0).map((_, funcIndex) => (
              <div key={funcIndex} className="grid grid-cols-8">
                <div className="p-3 border-r bg-gray-50 flex items-center gap-2">
                  <Skeleton circle width={16} height={16} />
                  <Skeleton width={100} />
                </div>
                {Array(7).fill(0).map((_, dayIndex) => (
                  <div key={dayIndex} className="p-3 border-r last:border-r-0 min-h-[80px]">
                    {Math.random() > 0.5 && (
                      <Skeleton height={60} borderRadius={8} />
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array(count).fill(0).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton width={120} height={24} />
            <Skeleton circle width={32} height={32} />
          </div>
          <Skeleton count={2} className="mb-2" />
          <div className="flex items-center gap-4 mt-4">
            <Skeleton width={80} />
            <Skeleton width={80} />
          </div>
        </div>
      ))}
    </div>
  )
}
