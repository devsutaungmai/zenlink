"use client"

import { cn } from "@/shared/lib/utils"
import React from "react"

interface ResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void
}

export function ResizeHandle({ onMouseDown }: ResizeHandleProps) {
  return (
    <div
      onMouseDown={onMouseDown}
      className={cn(
        "absolute right-0 top-0 bottom-0 w-[5px] cursor-col-resize z-10",
        "group/handle flex items-center justify-center",
        "hover:bg-[#31BCFF]/20 active:bg-[#31BCFF]/30"
      )}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize column"
    >
      <div
        className={cn(
          "w-[2px] h-full transition-colors duration-150",
          "bg-transparent group-hover/handle:bg-[#31BCFF] active:bg-[#31BCFF]"
        )}
      />
    </div>
  )
}
