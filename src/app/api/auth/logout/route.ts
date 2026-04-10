import { NextResponse } from 'next/server'

// Clears the employee_token cookie.
// Admin session is managed by Auth.js (signOut handles it client-side).
export async function POST() {
  const response = NextResponse.json({ success: true }, { status: 200 })
  response.cookies.delete('employee_token')
  return response
}
