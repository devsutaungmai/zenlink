"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  dateFormat?: string
  yearRange?: { from: number; to: number }
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  disabled = false,
  className,
  dateFormat = "dd/MM/yyyy",
  yearRange,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  const currentYear = new Date().getFullYear()
  const fromYear = yearRange?.from ?? currentYear - 100
  const toYear = yearRange?.to ?? currentYear + 1

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-auto px-3 py-2 border border-gray-300 rounded-md bg-white shadow-sm hover:border-gray-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500",
            !date && "text-gray-500",
            disabled && "opacity-50 cursor-not-allowed",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4 flex-shrink-0" />
          <span className="flex-1 truncate">
            {date ? format(date, dateFormat) : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(selectedDate) => {
            onDateChange?.(selectedDate)
            setIsOpen(false)
          }}
          disabled={(date) =>
            date > new Date(toYear, 11, 31) || date < new Date(fromYear, 0, 1)
          }
          initialFocus
          captionLayout="dropdown"
          fromYear={fromYear}
          toYear={toYear}
        />
      </PopoverContent>
    </Popover>
  )
}