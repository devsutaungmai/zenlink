import Skeleton from 'react-loading-skeleton'
import 'react-loading-skeleton/dist/skeleton.css'
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export function AvailabilitySkeleton() {
  return (
    <div className="h-full flex flex-col space-y-4 sm:space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-blue-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
          <div className="flex-1">
            <Skeleton width={200} height={32} className="mb-2" />
            <Skeleton width={300} height={16} />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array(4).fill(0).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Skeleton circle width={32} height={32} className="flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <Skeleton width={40} height={24} className="mb-1" />
                    <Skeleton width={80} height={14} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Skeleton height={40} borderRadius={8} />
                </div>
              </div>
              
              <div className="flex gap-2 sm:gap-3">
                <Skeleton width={100} height={40} borderRadius={8} />
                <Skeleton width={120} height={40} borderRadius={8} />
              </div>
            </div>
          
            {/* Results summary and view toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <Skeleton width={200} height={16} />
                
                {/* View mode toggle */}
                <div className="flex items-center gap-2">
                  <Skeleton width={40} height={16} />
                  <Skeleton width={120} height={32} borderRadius={6} />
                </div>
              </div>
              
              <Skeleton width={80} height={16} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Calendar View */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <Skeleton width={150} height={24} />
            <div className="flex items-center gap-2">
              <Skeleton circle width={32} height={32} />
              <Skeleton circle width={32} height={32} />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          {/* Mobile Calendar Skeleton */}
          <div className="lg:hidden">
            {/* Mobile: Vertical Employee Cards */}
            <div className="space-y-4">
              {Array(6).fill(0).map((_, empIndex) => (
                <div key={empIndex} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  {/* Employee Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Skeleton circle width={40} height={40} />
                      <div>
                        <Skeleton width={120} height={18} />
                        <Skeleton width={80} height={14} className="mt-1" />
                      </div>
                    </div>
                    <Skeleton width={90} height={24} borderRadius={12} />
                  </div>
                  
                  {/* Calendar Grid - Mobile Optimized */}
                  <div className="grid grid-cols-7 gap-1">
                    {/* Week header */}
                    {Array(7).fill(0).map((_, dayIndex) => (
                      <div key={dayIndex} className="text-center p-1">
                        <Skeleton width={20} height={12} />
                      </div>
                    ))}
                    
                    {/* Calendar days - Multiple weeks */}
                    {Array(28).fill(0).map((_, dayIndex) => (
                      <div key={dayIndex} className="aspect-square p-1">
                        <Skeleton height="100%" borderRadius={8} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop Calendar Grid */}
          <div className="hidden lg:block overflow-x-auto -mx-3 sm:mx-0">
            <div className="min-w-[800px] px-3 sm:px-0">
              {/* Week days header */}
              <div className="grid grid-cols-8 gap-1 mb-2">
                <div className="p-1 sm:p-2">
                  <Skeleton width={80} height={16} />
                </div>
                {Array(7).fill(0).map((_, i) => (
                  <div key={i} className="p-1 sm:p-2 bg-gray-50 rounded">
                    <Skeleton width={40} height={16} />
                  </div>
                ))}
              </div>

              {/* Employee rows */}
              {Array(6).fill(0).map((_, empIndex) => (
                <div key={empIndex} className="grid grid-cols-8 gap-1 mb-1 items-center">
                  <div className="p-1 sm:p-2">
                    <Skeleton width={120} height={16} className="mb-1" />
                    <Skeleton width={60} height={12} className="mb-1" />
                    <Skeleton width={80} height={20} borderRadius={12} />
                  </div>
                  
                  {/* Calendar days for this employee */}
                  {Array(7).fill(0).map((_, dayIndex) => (
                    <div key={dayIndex} className="p-2 border border-gray-200 rounded transition-all">
                      <Skeleton height={32} borderRadius={6} />
                    </div>
                  ))}
                </div>
              ))}
              
              {/* Additional calendar weeks */}
              {Array(3).fill(0).map((_, weekIndex) => (
                <div key={`week-${weekIndex}`} className="mt-4">
                  {Array(6).fill(0).map((_, empIndex) => (
                    <div key={empIndex} className="grid grid-cols-8 gap-1 mb-1 items-center">
                      <div className="p-1 sm:p-2">
                        <Skeleton width={120} height={16} className="mb-1" />
                        <Skeleton width={60} height={12} className="mb-1" />
                        <Skeleton width={80} height={20} borderRadius={12} />
                      </div>
                      
                      {Array(7).fill(0).map((_, dayIndex) => (
                        <div key={dayIndex} className="p-2 border border-gray-200 rounded">
                          <Skeleton height={32} borderRadius={6} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Skeleton circle width={32} height={32} />
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} circle width={32} height={32} />
          ))}
          <Skeleton circle width={32} height={32} />
        </div>
      </div>
    </div>
  )
}
