'use client'

import { useEffect } from 'react'
import { ExclamationTriangleIcon, ArrowPathIcon, HomeIcon } from '@heroicons/react/24/outline'
import { Button } from '@/components/ui/button'
import * as Sentry from '@sentry/nextjs'

interface ErrorPageProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    Sentry.captureException(error)
    console.error('Application error:', error)
  }, [error])

  const isDevelopment = process.env.NODE_ENV === 'development'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-16 w-16 text-red-500 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Something went wrong
            </h1>
            <p className="text-gray-600 mb-6">
              We encountered an unexpected error. Please try again or contact support if the problem persists.
            </p>

            {isDevelopment && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                <h3 className="text-sm font-medium text-red-800 mb-2">
                  Development Error Details:
                </h3>
                <p className="text-xs text-red-700 font-mono break-all">
                  {error.message}
                </p>
                {error.digest && (
                  <p className="text-xs text-red-600 mt-2">
                    Error ID: {error.digest}
                  </p>
                )}
              </div>
            )}

            <div className="mt-6 text-xs text-gray-500">
              <p>If this error continues, please contact our support team.</p>
              <p className="mt-1">
                Error occurred at: {new Date().toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
