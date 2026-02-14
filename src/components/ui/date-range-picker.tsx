"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { DateRangeCalendar } from "./date-range-calendar"
import { cn } from "@/shared/lib/utils"

interface DateRangePickerProps {
  dateRange: { startDate: string; endDate: string }
  onDateRangeChange: (range: { startDate: string; endDate: string }) => void
  className?: string
}

function formatDateLocal(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)

  const selected: DateRange = {
    from: new Date(dateRange.startDate + "T00:00:00"),
    to: new Date(dateRange.endDate + "T00:00:00"),
  }

  const handleSelect = (range: DateRange | undefined) => {
    if (range?.from) {
      onDateRangeChange({
        startDate: formatDateLocal(range.from),
        endDate: range.to ? formatDateLocal(range.to) : formatDateLocal(range.from),
      })
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start gap-2 bg-transparent text-left font-normal",
            !dateRange && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs sm:text-sm truncate">
            {selected.from ? (
              selected.to ? (
                <>
                  {format(selected.from, "MMM dd, yyyy")} -{" "}
                  {format(selected.to, "MMM dd, yyyy")}
                </>
              ) : (
                format(selected.from, "MMM dd, yyyy")
              )
            ) : (
              "Pick a date range"
            )}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <DateRangeCalendar
          mode="range"
          defaultMonth={selected.from}
          selected={selected}
          onSelect={handleSelect}
          numberOfMonths={2}
        />
      </PopoverContent>
    </Popover>
  )
}
