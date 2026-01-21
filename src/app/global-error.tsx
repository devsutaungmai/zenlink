'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f9fafb',
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '0.5rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            textAlign: 'center',
            maxWidth: '400px'
          }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#111827' }}>
              Something went wrong
            </h1>
            <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
              A critical error occurred. Please try refreshing the page.
            </p>
            <button
              onClick={() => reset()}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '500'
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
