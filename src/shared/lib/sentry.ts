import * as Sentry from '@sentry/nextjs'

interface UserContext {
  id: string
  email?: string
  businessId?: string
  role?: string
}

interface BusinessContext {
  id: string
  name?: string
}

export function setSentryUser(user: UserContext) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
  })
  
  if (user.businessId) {
    Sentry.setContext('business', {
      id: user.businessId,
    })
  }
  
  if (user.role) {
    Sentry.setTag('user.role', user.role)
  }
}

export function setSentryEmployee(employee: { id: string; businessId?: string }) {
  Sentry.setUser({
    id: employee.id,
  })
  Sentry.setTag('user.type', 'employee')
  
  if (employee.businessId) {
    Sentry.setContext('business', {
      id: employee.businessId,
    })
  }
}

export function clearSentryUser() {
  Sentry.setUser(null)
}

export function captureApiError(
  error: unknown,
  context: {
    route: string
    method: string
    params?: Record<string, unknown>
  }
) {
  Sentry.withScope((scope) => {
    scope.setTag('api.route', context.route)
    scope.setTag('api.method', context.method)
    
    if (context.params) {
      scope.setContext('request', context.params)
    }
    
    if (error instanceof Error) {
      Sentry.captureException(error)
    } else {
      Sentry.captureMessage(String(error), 'error')
    }
  })
}

export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info',
  extra?: Record<string, unknown>
) {
  Sentry.withScope((scope) => {
    if (extra) {
      scope.setContext('extra', extra)
    }
    Sentry.captureMessage(message, level)
  })
}

export async function withSentrySpan<T>(
  name: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  return Sentry.startSpan(
    {
      name,
      op: operation,
    },
    async () => {
      return await fn()
    }
  )
}

export { Sentry }
