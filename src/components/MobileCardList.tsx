import React, { ReactNode } from 'react'

interface MobileCardProps {
  children: ReactNode
  className?: string
}

export const MobileCard: React.FC<MobileCardProps> = ({ children, className = '' }) => {
  return (
    <div className={`bg-white/80 backdrop-blur-xl rounded-xl border border-gray-200/50 shadow-lg p-4 space-y-3 ${className}`}>
      {children}
    </div>
  )
}

interface MobileCardHeaderProps {
  title: string
  subtitle?: string
  badge?: ReactNode
  className?: string
}

export const MobileCardHeader: React.FC<MobileCardHeaderProps> = ({ 
  title, 
  subtitle, 
  badge,
  className = '' 
}) => {
  return (
    <div className={`flex items-start justify-between gap-2 ${className}`}>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-gray-900">
          {title}
        </div>
        {subtitle && (
          <div className="text-xs text-gray-500 mt-0.5">
            {subtitle}
          </div>
        )}
      </div>
      {badge && (
        <div className="flex-shrink-0">
          {badge}
        </div>
      )}
    </div>
  )
}

interface MobileCardFieldProps {
  label: string
  value: ReactNode
  className?: string
}

export const MobileCardField: React.FC<MobileCardFieldProps> = ({ label, value, className = '' }) => {
  return (
    <div className={className}>
      <div className="text-xs text-gray-500 mb-0.5">{label}</div>
      <div className="font-medium text-gray-900 text-sm">{value}</div>
    </div>
  )
}

interface MobileCardGridProps {
  children: ReactNode
  columns?: 2 | 3
  className?: string
}

export const MobileCardGrid: React.FC<MobileCardGridProps> = ({ 
  children, 
  columns = 2,
  className = '' 
}) => {
  const gridClass = columns === 2 ? 'grid-cols-2' : 'grid-cols-3'
  return (
    <div className={`grid ${gridClass} gap-3 text-sm ${className}`}>
      {children}
    </div>
  )
}

interface MobileCardSectionProps {
  children: ReactNode
  className?: string
}

export const MobileCardSection: React.FC<MobileCardSectionProps> = ({ 
  children,
  className = '' 
}) => {
  return (
    <div className={`pt-2 border-t border-gray-200 ${className}`}>
      {children}
    </div>
  )
}

interface MobileCardActionsProps {
  children: ReactNode
  className?: string
}

export const MobileCardActions: React.FC<MobileCardActionsProps> = ({ 
  children,
  className = '' 
}) => {
  return (
    <div className={`flex items-center justify-end gap-2 pt-2 border-t border-gray-200 ${className}`}>
      {children}
    </div>
  )
}

interface MobileCardListProps {
  children: ReactNode
  className?: string
}

export const MobileCardList: React.FC<MobileCardListProps> = ({ 
  children,
  className = '' 
}) => {
  return (
    <div className={`lg:hidden space-y-3 ${className}`}>
      {children}
    </div>
  )
}

// Badge component for consistency
interface BadgeProps {
  children: ReactNode
  variant?: 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'gray' | 'yellow'
  className?: string
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  variant = 'blue',
  className = '' 
}) => {
  const variantClasses = {
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    green: 'bg-green-100 text-green-800 border-green-200',
    orange: 'bg-orange-100 text-orange-800 border-orange-200',
    red: 'bg-red-100 text-red-800 border-red-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  }
  
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  )
}
