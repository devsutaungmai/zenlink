import { Card, CardContent } from "@/components/ui/card"

interface CurrentTimeCardProps {
  currentTime: Date
}

export default function CurrentTimeCard({ currentTime }: CurrentTimeCardProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour12: true,
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <Card className="bg-white/95 backdrop-blur border-sky-200 mb-8">
      <CardContent className="text-center py-8">
        <div className="text-6xl font-bold text-sky-700 mb-2" suppressHydrationWarning>
          {formatTime(currentTime)}
        </div>
        <p className="text-sky-600 text-xl" suppressHydrationWarning>
          {formatDate(currentTime)}
        </p>
      </CardContent>
    </Card>
  )
}
