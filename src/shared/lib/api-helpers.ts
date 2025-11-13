/**
 * Helper function to handle the transition from old employees API format to new paginated format
 * @param data - Response data from /api/employees
 * @returns Array of employees
 */
export function extractEmployeesFromResponse(data: any): any[] {
  if (data.employees && Array.isArray(data.employees)) {
    return data.employees
  }

  if (Array.isArray(data)) {
    return data
  }

  console.error('Expected employees array but got:', data)
  return []
}

export async function fetchEmployees(params?: Record<string, string>): Promise<any[]> {
  try {
    const queryString = params ? '?' + new URLSearchParams(params).toString() : ''
    const response = await fetch(`/api/employees${queryString}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch employees: ${response.statusText}`)
    }
    
    const data = await response.json()
    return extractEmployeesFromResponse(data)
  } catch (error) {
    console.error('Error fetching employees:', error)
    return []
  }
}
