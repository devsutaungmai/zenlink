import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, Users, Calendar, Clock } from "lucide-react"
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'

interface QuickActionsCardProps {
  pendingRequestsCount: number
  onShowPendingRequests: () => void
  onShowSchedule: () => void
}

export default function QuickActionsCard({ 
  pendingRequestsCount, 
  onShowPendingRequests, 
  onShowSchedule 
}: QuickActionsCardProps) {
  const { t } = useTranslation('employee-dashboard')
  const router = useRouter()

  return (
    <Card className="bg-white/95 backdrop-blur border-sky-200">
      <CardHeader>
        <CardTitle className="text-sky-700">{t('quick_actions.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="border-sky-300 text-sky-700 hover:bg-sky-50 py-3 relative"
            onClick={onShowPendingRequests}
          >
            <Bell className="w-4 h-4 mr-2" />
            {t('quick_actions.requests')}
            {pendingRequestsCount > 0 && (
              <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] h-5 flex items-center justify-center">
                {pendingRequestsCount}
              </Badge>
            )}
          </Button>
          <Button 
            variant="outline" 
            className="border-sky-300 text-sky-700 hover:bg-sky-50 py-3"
            onClick={() => router.push('/dashboard/teams')}
          >
            <Users className="w-4 h-4 mr-2" />
            {t('quick_actions.team')}
          </Button>
          <Button 
            variant="outline" 
            className="border-sky-300 text-sky-700 hover:bg-sky-50 py-3"
            onClick={onShowSchedule}
          >
            <Calendar className="w-4 h-4 mr-2" />
            {t('quick_actions.my_schedule')}
          </Button>
          <Button 
            variant="outline" 
            className="border-sky-300 text-sky-700 hover:bg-sky-50 py-3"
            onClick={() => router.push('/employee/availability')}
          >
            <Clock className="w-4 h-4 mr-2" />
            {t('quick_actions.availability')}
          </Button>
          <Button 
            variant="outline" 
            className="border-sky-300 text-sky-700 hover:bg-sky-50 py-3"
            onClick={() => router.push('/dashboard/sick-leaves')}
          >
            <Bell className="w-4 h-4 mr-2" />
            {t('quick_actions.sick_leave')}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
