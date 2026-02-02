import { nb, de, enUS, Locale } from 'date-fns/locale'
import { format as dateFnsFormat } from 'date-fns'

const localeMap: Record<string, Locale> = {
  en: enUS,
  no: nb,
  de: de
}

export function getDateLocale(language: string): Locale {
  return localeMap[language] || enUS
}

export function formatDate(date: Date, formatStr: string, language: string): string {
  return dateFnsFormat(date, formatStr, { locale: getDateLocale(language) })
}
