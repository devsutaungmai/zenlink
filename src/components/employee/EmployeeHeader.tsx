import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import LanguageSwitcher from "@/components/LanguageSwitcher"
import NotificationCenter from "@/components/NotificationCenter"
import { useTranslation } from 'react-i18next'

interface EmployeeHeaderProps {
  employeeName: { firstName: string; lastName: string }
  employeeId: string
  onLogout: () => void
}

export default function EmployeeHeader({ employeeName, employeeId, onLogout }: EmployeeHeaderProps) {
  const { t } = useTranslation('employee-dashboard')
  
  return (
    <div className="flex justify-between items-center mb-8">
      <div className="flex items-center gap-6">
        <div>
          <h1 className="text-4xl font-bold text-sky-700">{t('title')}</h1>
          <p className="text-sky-600 text-lg">
            {t('welcome_back', { firstName: employeeName.firstName, lastName: employeeName.lastName })}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <LanguageSwitcher />
        <NotificationCenter employeeId={employeeId} />
        <Button 
          variant="outline" 
          className="border-sky-300 text-sky-700 hover:bg-sky-50 px-6 py-3"
          onClick={onLogout}
        >
          <LogOut className="w-5 h-5 mr-2" />
          {t('header.logout')}
        </Button>
      </div>
    </div>
  )
}
