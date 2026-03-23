"use client"

import { cn } from "@/shared/lib/utils"
import React from "react"
import { ResizeHandle } from "./resize-handle"

interface DraggableTableHeaderProps {
    columnKey: string
    children: React.ReactNode
    className?: string
    // Resize props
    onResizeMouseDown: (e: React.MouseEvent) => void
    // Drag props
    isDragging: boolean
    isDropTarget: boolean
    onDragStart: (e: React.DragEvent) => void
    onDragOver: (e: React.DragEvent) => void
    onDragLeave: () => void
    onDrop: (e: React.DragEvent) => void
    onDragEnd: () => void
    /** If false, disables drag-and-drop (useful for actions column) */
    draggable?: boolean
}

export function DraggableTableHeader({
    columnKey,
    children,
    className,
    onResizeMouseDown,
    isDragging,
    isDropTarget,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    onDragEnd,
    draggable = true,
}: DraggableTableHeaderProps) {
    return (
        <th
            data-column-key={columnKey}
            draggable={draggable}
            onDragStart={draggable ? onDragStart : undefined}
            onDragOver={draggable ? onDragOver : undefined}
            onDragLeave={draggable ? onDragLeave : undefined}
            onDrop={draggable ? onDrop : undefined}
            onDragEnd={draggable ? onDragEnd : undefined}
            className={cn(
                "relative px-6 py-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider select-none border-r border-border",
                draggable && "cursor-grab active:cursor-grabbing",
                isDragging && "opacity-50 bg-muted",
                isDropTarget && "bg-[#31BCFF]/10 border-l-2 border-l-[#31BCFF]",
                className
            )}
        >
            <div className="flex items-center gap-2">
                {draggable && (
                    <span className="text-muted-foreground/50 flex-shrink-0">
                        <svg
                            width="8"
                            height="14"
                            viewBox="0 0 8 14"
                            fill="currentColor"
                            className="opacity-0 group-hover/th:opacity-100 transition-opacity"
                        >
                            <circle cx="2" cy="2" r="1.5" />
                            <circle cx="6" cy="2" r="1.5" />
                            <circle cx="2" cy="7" r="1.5" />
                            <circle cx="6" cy="7" r="1.5" />
                            <circle cx="2" cy="12" r="1.5" />
                            <circle cx="6" cy="12" r="1.5" />
                        </svg>
                    </span>
                )}
                <span className="flex-1">{children}</span>
            </div>
            <ResizeHandle onMouseDown={onResizeMouseDown} />
        </th>
    )
}
