import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { User } from "lucide-react"
import { useTranslation } from 'react-i18next'

interface Employee {
  id: string
  firstName: string
  lastName: string
  employeeNo: string
  department: {
    name: string
  }
  employeeGroup?: {
    name: string
  }
}

interface EmployeeProfileCardProps {
  employee: Employee
}

export default function EmployeeProfileCard({ employee }: EmployeeProfileCardProps) {
  const { t } = useTranslation('employee-dashboard')

  return (
    <Card className="bg-white/95 backdrop-blur border-sky-200">
      <CardHeader>
        <CardTitle className="text-sky-700 flex items-center gap-2">
          <User className="w-6 h-6" />
          {t('profile.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-sky-600" />
            </div>
            <div>
              <h3 className="font-semibold text-sky-700">
                {employee.firstName} {employee.lastName}
              </h3>
              <p className="text-sky-600">{t('profile.employee')}</p>
              <p className="text-sky-500 text-sm">{employee.department.name}</p>
            </div>
          </div>
          <Separator />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-sky-600">{t('profile.employee_id')}</span>
              <span className="font-medium">{employee.employeeNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sky-600">{t('profile.department')}</span>
              <span className="font-medium">{employee.department.name}</span>
            </div>
            {employee.employeeGroup && (
              <div className="flex justify-between">
                <span className="text-sky-600">{t('profile.group')}</span>
                <span className="font-medium">{employee.employeeGroup.name}</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
