/**
 * Fetch employees with automatic error handling
 * @param params - Optional query parameters
 * @returns Promise<any[]> - Array of employees
 */
export async function fetchEmployees(params?: Record<string, string>): Promise<any[]> {
  try {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : ''
    const response = await fetch(`/api/employees${queryString}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch employees: ${response.statusText}`)
    }
    
    const data = await response.json()
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Error fetching employees:', error)
    return []
  }
}
