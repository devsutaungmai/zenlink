import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import main translation files
import en from '../../locales/en.json'
import no from '../../locales/no.json'
import de from '../../locales/de.json'

// Import schedule-specific translations
import scheduleEn from '../../locales/schedule/en.json'
import scheduleNo from '../../locales/schedule/no.json'
import scheduleDe from '../../locales/schedule/de.json'

// Import punch-clock-specific translations
import punchClockEn from '../../locales/punch-clock/en.json'
import punchClockNo from '../../locales/punch-clock/no.json'
import punchClockDe from '../../locales/punch-clock/de.json'

// Import availability-specific translations
import availabilityEn from '../../locales/availability/en.json'
import availabilityNo from '../../locales/availability/no.json'
import availabilityDe from '../../locales/availability/de.json'

// Import sick-leave-specific translations
import sickLeaveEn from '../../locales/sick-leave/en.json'
import sickLeaveNo from '../../locales/sick-leave/no.json'
import sickLeaveDe from '../../locales/sick-leave/de.json'

// Import pending-requests-specific translations
import pendingRequestsEn from '../../locales/pending-requests/en.json'
import pendingRequestsNo from '../../locales/pending-requests/no.json'
import pendingRequestsDe from '../../locales/pending-requests/de.json'

// Import payroll-entries-specific translations
import payrollEntriesEn from '../../locales/payroll-entries/en.json'
import payrollEntriesNo from '../../locales/payroll-entries/no.json'
import payrollEntriesDe from '../../locales/payroll-entries/de.json'

// Import payroll-periods-specific translations
import payrollPeriodsEn from '../../locales/payroll-periods/en.json'
import payrollPeriodsNo from '../../locales/payroll-periods/no.json'
import payrollPeriodsDe from '../../locales/payroll-periods/de.json'

// Import payroll-reports-specific translations
import payrollReportsEn from '../../locales/payroll-reports/en.json'
import payrollReportsNo from '../../locales/payroll-reports/no.json'
import payrollReportsDe from '../../locales/payroll-reports/de.json'

// Import employee-dashboard-specific translations
import employeeDashboardEn from '../../locales/employee-dashboard/en.json'
import employeeDashboardNo from '../../locales/employee-dashboard/no.json'
import employeeDashboardDe from '../../locales/employee-dashboard/de.json'

// Import shift-types-specific translations
import shiftTypesEn from '../../locales/en/shift-types.json'
import shiftTypesNo from '../../locales/no/shift-types.json'
import shiftTypesDe from '../../locales/de/shift-types.json'

// Import settings translations
import settingsEn from '../../locales/settings/en.json'
import settingsNo from '../../locales/settings/no.json'
import settingsDe from '../../locales/settings/de.json'

// Import settings translations
import salaryCodeEn from '../../locales/salary-codes/en.json'
import salaryCodeNo from '../../locales/salary-codes/no.json'
import salaryCodeDe from '../../locales/salary-codes/de.json'

const resources = {
  en: { 
    translation: en,
    schedule: scheduleEn,
    'punch-clock': punchClockEn,
    availability: availabilityEn,
    'sick-leave': sickLeaveEn,
    'pending-requests': pendingRequestsEn,
    'payroll-entries': payrollEntriesEn,
    'payroll-periods': payrollPeriodsEn,
    'payroll-reports': payrollReportsEn,
    'employee-dashboard': employeeDashboardEn,
    'shift-types': shiftTypesEn,
    settings: settingsEn,
    'salary-codes':salaryCodeEn

  },
  no: { 
    translation: no,
    schedule: scheduleNo,
    'punch-clock': punchClockNo,
    availability: availabilityNo,
    'sick-leave': sickLeaveNo,
    'pending-requests': pendingRequestsNo,
    'payroll-entries': payrollEntriesNo,
    'payroll-periods': payrollPeriodsNo,
    'payroll-reports': payrollReportsNo,
    'employee-dashboard': employeeDashboardNo,
    'shift-types': shiftTypesNo,
    settings: settingsNo,
    'salary-codes': salaryCodeNo
  },
  de: { 
    translation: de,
    schedule: scheduleDe,
    'punch-clock': punchClockDe,
    availability: availabilityDe,
    'sick-leave': sickLeaveDe,
    'pending-requests': pendingRequestsDe,
    'payroll-entries': payrollEntriesDe,
    'payroll-periods': payrollPeriodsDe,
    'payroll-reports': payrollReportsDe,
    'employee-dashboard': employeeDashboardDe,
    'shift-types': shiftTypesDe,
    settings: settingsDe,
    'salary-codes': salaryCodeDe

  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    interpolation: {
      escapeValue: false,
    },
    
    detection: {
      order: ['localStorage', 'cookie', 'navigator', 'htmlTag'],
      caches: ['localStorage', 'cookie'],
    },

    // Support for namespaces
    ns: ['translation', 'schedule', 'punch-clock', 'availability', 'sick-leave', 'pending-requests', 'payroll-entries', 'payroll-periods', 'payroll-reports', 'employee-dashboard','settings','salary-codes'],
    defaultNS: 'translation',
  })

export default i18n