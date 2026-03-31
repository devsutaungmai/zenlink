export function formatTimeFromDateTime(value: Date | string | null | undefined): string | null {
  if (!value) return null

  if (typeof value === 'string' && /^\d{2}:\d{2}$/.test(value)) {
    return value
  }

  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return `${hours}:${minutes}`
}
