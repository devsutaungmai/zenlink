"use client"

import { useState, useCallback, useRef, useEffect } from "react"

export interface ColumnWidth {
  key: string
  width: number
  minWidth?: number
}

interface UseResizableColumnsOptions {
  /** Unique key for localStorage persistence */
  storageKey?: string
  /** Initial column widths configuration */
  columns: { key: string; initialWidth: number; minWidth?: number }[]
}

export function useResizableColumns({ storageKey, columns }: UseResizableColumnsOptions) {
  // Initialize widths from localStorage or defaults
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    if (storageKey && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(storageKey)
        if (stored) {
          return JSON.parse(stored) as Record<string, number>
        }
      } catch {
        // Ignore
      }
    }
    return Object.fromEntries(columns.map((col) => [col.key, col.initialWidth]))
  })

  const minWidths = useRef<Record<string, number>>(
    Object.fromEntries(columns.map((col) => [col.key, col.minWidth ?? 50]))
  )

  // Track dragging state
  const dragging = useRef<{
    key: string
    startX: number
    startWidth: number
  } | null>(null)

  const onMouseDown = useCallback(
    (key: string) => (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const startWidth = columnWidths[key] ?? 150
      dragging.current = { key, startX: e.clientX, startWidth }
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
    },
    [columnWidths]
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return
      const { key, startX, startWidth } = dragging.current
      const diff = e.clientX - startX
      const min = minWidths.current[key] ?? 50
      const newWidth = Math.max(min, startWidth + diff)
      setColumnWidths((prev) => ({ ...prev, [key]: newWidth }))
    }

    const handleMouseUp = () => {
      if (!dragging.current) return
      dragging.current = null
      document.body.style.cursor = ""
      document.body.style.userSelect = ""

      // Persist to localStorage
      if (storageKey) {
        setColumnWidths((prev) => {
          localStorage.setItem(storageKey, JSON.stringify(prev))
          return prev
        })
      }
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [storageKey])

  const getColumnWidth = useCallback(
    (key: string) => columnWidths[key] ?? 150,
    [columnWidths]
  )

  const resetWidths = useCallback(() => {
    const defaults = Object.fromEntries(columns.map((col) => [col.key, col.initialWidth]))
    setColumnWidths(defaults)
    if (storageKey && typeof window !== "undefined") {
      localStorage.removeItem(storageKey)
    }
  }, [columns, storageKey])

  return {
    columnWidths,
    getColumnWidth,
    onMouseDown,
    resetWidths,
  }
}
