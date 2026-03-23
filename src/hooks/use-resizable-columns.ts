"use client"

import { useState, useCallback, useRef, useEffect } from "react"

export interface ColumnConfig {
  key: string
  initialWidth: number
  minWidth?: number
}

interface UseResizableColumnsOptions {
  /** Unique key for localStorage persistence */
  storageKey?: string
  /** Initial column configuration */
  columns: ColumnConfig[]
}

interface ResizableColumnsReturn {
  columnWidths: Record<string, number>
  columnOrder: string[]
  getColumnWidth: (key: string) => number
  onMouseDown: (key: string) => (e: React.MouseEvent) => void
  resetWidths: () => void
  // Drag and drop column reordering
  draggedColumn: string | null
  dropTargetColumn: string | null
  onDragStart: (key: string) => (e: React.DragEvent) => void
  onDragOver: (key: string) => (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (key: string) => (e: React.DragEvent) => void
  onDragEnd: () => void
  resetColumnOrder: () => void
  getOrderedColumns: <T extends { key: string }>(columns: T[]) => T[]
}

export function useResizableColumns({ storageKey, columns }: UseResizableColumnsOptions): ResizableColumnsReturn {
  const widthsStorageKey = storageKey ? `${storageKey}-widths` : undefined
  const orderStorageKey = storageKey ? `${storageKey}-order` : undefined

  // Initialize widths from localStorage or defaults
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>(() => {
    if (widthsStorageKey && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(widthsStorageKey)
        if (stored) {
          return JSON.parse(stored) as Record<string, number>
        }
      } catch {
        // Ignore
      }
    }
    return Object.fromEntries(columns.map((col) => [col.key, col.initialWidth]))
  })

  // Initialize column order from localStorage or defaults
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    if (orderStorageKey && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(orderStorageKey)
        if (stored) {
          const parsedOrder = JSON.parse(stored) as string[]
          // Ensure all current columns are included (in case new columns were added)
          const allKeys = columns.map((col) => col.key)
          const validOrder = parsedOrder.filter((key) => allKeys.includes(key))
          const missingKeys = allKeys.filter((key) => !validOrder.includes(key))
          return [...validOrder, ...missingKeys]
        }
      } catch {
        // Ignore
      }
    }
    return columns.map((col) => col.key)
  })

  const minWidths = useRef<Record<string, number>>(
    Object.fromEntries(columns.map((col) => [col.key, col.minWidth ?? 50]))
  )

  // Track resize dragging state
  const resizeDragging = useRef<{
    key: string
    startX: number
    startWidth: number
  } | null>(null)

  // Track column drag-and-drop state
  const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
  const [dropTargetColumn, setDropTargetColumn] = useState<string | null>(null)

  // Column resize handlers
  const onMouseDown = useCallback(
    (key: string) => (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const startWidth = columnWidths[key] ?? 150
      resizeDragging.current = { key, startX: e.clientX, startWidth }
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
    },
    [columnWidths]
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeDragging.current) return
      const { key, startX, startWidth } = resizeDragging.current
      const diff = e.clientX - startX
      const min = minWidths.current[key] ?? 50
      const newWidth = Math.max(min, startWidth + diff)
      setColumnWidths((prev) => ({ ...prev, [key]: newWidth }))
    }

    const handleMouseUp = () => {
      if (!resizeDragging.current) return
      resizeDragging.current = null
      document.body.style.cursor = ""
      document.body.style.userSelect = ""

      // Persist to localStorage
      if (widthsStorageKey) {
        setColumnWidths((prev) => {
          localStorage.setItem(widthsStorageKey, JSON.stringify(prev))
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
  }, [widthsStorageKey])

  const getColumnWidth = useCallback(
    (key: string) => columnWidths[key] ?? 150,
    [columnWidths]
  )

  const resetWidths = useCallback(() => {
    const defaults = Object.fromEntries(columns.map((col) => [col.key, col.initialWidth]))
    setColumnWidths(defaults)
    if (widthsStorageKey && typeof window !== "undefined") {
      localStorage.removeItem(widthsStorageKey)
    }
  }, [columns, widthsStorageKey])

  // Column drag-and-drop reordering handlers
  const onDragStart = useCallback(
    (key: string) => (e: React.DragEvent) => {
      setDraggedColumn(key)
      e.dataTransfer.effectAllowed = "move"
      e.dataTransfer.setData("text/plain", key)
      // Add a slight delay to show the drag effect
      requestAnimationFrame(() => {
        const target = e.target as HTMLElement
        target.style.opacity = "0.5"
      })
    },
    []
  )

  const onDragOver = useCallback(
    (key: string) => (e: React.DragEvent) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = "move"
      if (key !== draggedColumn) {
        setDropTargetColumn(key)
      }
    },
    [draggedColumn]
  )

  const onDragLeave = useCallback(() => {
    setDropTargetColumn(null)
  }, [])

  const onDrop = useCallback(
    (key: string) => (e: React.DragEvent) => {
      e.preventDefault()
      const draggedKey = e.dataTransfer.getData("text/plain")
      
      if (draggedKey && draggedKey !== key) {
        setColumnOrder((prevOrder) => {
          const newOrder = [...prevOrder]
          const draggedIndex = newOrder.indexOf(draggedKey)
          const dropIndex = newOrder.indexOf(key)
          
          if (draggedIndex !== -1 && dropIndex !== -1) {
            // Remove dragged column from its position
            newOrder.splice(draggedIndex, 1)
            // Insert at drop position
            newOrder.splice(dropIndex, 0, draggedKey)
            
            // Persist to localStorage
            if (orderStorageKey && typeof window !== "undefined") {
              localStorage.setItem(orderStorageKey, JSON.stringify(newOrder))
            }
          }
          
          return newOrder
        })
      }
      
      setDraggedColumn(null)
      setDropTargetColumn(null)
    },
    [orderStorageKey]
  )

  const onDragEnd = useCallback(() => {
    setDraggedColumn(null)
    setDropTargetColumn(null)
    // Reset opacity on all draggable elements
    document.querySelectorAll("[draggable]").forEach((el) => {
      ;(el as HTMLElement).style.opacity = ""
    })
  }, [])

  const resetColumnOrder = useCallback(() => {
    const defaultOrder = columns.map((col) => col.key)
    setColumnOrder(defaultOrder)
    if (orderStorageKey && typeof window !== "undefined") {
      localStorage.removeItem(orderStorageKey)
    }
  }, [columns, orderStorageKey])

  // Helper to get columns in the current order
  const getOrderedColumns = useCallback(
    <T extends { key: string }>(cols: T[]): T[] => {
      return columnOrder
        .map((key) => cols.find((col) => col.key === key))
        .filter((col): col is T => col !== undefined)
    },
    [columnOrder]
  )

  return {
    columnWidths,
    columnOrder,
    getColumnWidth,
    onMouseDown,
    resetWidths,
    // Drag and drop
    draggedColumn,
    dropTargetColumn,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    onDragEnd,
    resetColumnOrder,
    getOrderedColumns,
  }
}
