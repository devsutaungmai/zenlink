import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { nextUrl } = req
  const session = req.auth

  const isAdminRoute = nextUrl.pathname.startsWith('/dashboard')
  const isLoginPage = nextUrl.pathname === '/login'

  // Redirect unauthenticated users away from protected routes
  if (isAdminRoute && !session) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  // Redirect already-authenticated admins away from the login page
  if (isLoginPage && session?.user?.role) {
    const role = session.user.role
    if (role === 'ADMIN' || role === 'MANAGER') {
      return NextResponse.redirect(new URL('/dashboard', nextUrl))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}
