"use client"

import { ColumnConfig } from "@/components/invoice/column-visibility-toggle"
import { useState, useCallback, useMemo } from "react"

interface UseColumnVisibilityOptions {
  /** Unique key for localStorage persistence */
  storageKey?: string
  /** Initial column configurations */
  initialColumns: Omit<ColumnConfig, "visible">[]
  /** Default visibility for each column (true if not specified) */
  defaultVisibility?: Record<string, boolean>
}

export function useColumnVisibility({
  storageKey,
  initialColumns,
  defaultVisibility = {},
}: UseColumnVisibilityOptions) {
  // Build default columns with visibility
  const defaultColumns = useMemo(() => {
    return initialColumns.map((col) => ({
      ...col,
      visible: defaultVisibility[col.key] ?? true,
    }))
  }, [initialColumns, defaultVisibility])

  // Initialize state from localStorage or defaults
  const [columns, setColumns] = useState<ColumnConfig[]>(() => {
    if (storageKey && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(storageKey)
        if (stored) {
          const parsed = JSON.parse(stored) as Record<string, boolean>
          return defaultColumns.map((col) => ({
            ...col,
            visible: parsed[col.key] ?? col.visible,
          }))
        }
      } catch {
        // Ignore localStorage errors
      }
    }
    return defaultColumns
  })

  // Toggle a single column's visibility
  const toggleColumn = useCallback(
    (key: string, visible: boolean) => {
      setColumns((prev) => {
        const updated = prev.map((col) => (col.key === key && !col.required ? { ...col, visible } : col))

        // Persist to localStorage
        if (storageKey && typeof window !== "undefined") {
          const visibility = Object.fromEntries(updated.map((col) => [col.key, col.visible]))
          localStorage.setItem(storageKey, JSON.stringify(visibility))
        }

        return updated
      })
    },
    [storageKey],
  )

  // Reset all columns to default visibility
  const resetColumns = useCallback(() => {
    setColumns(defaultColumns)
    if (storageKey && typeof window !== "undefined") {
      localStorage.removeItem(storageKey)
    }
  }, [defaultColumns, storageKey])

  // Get visible column keys for easy filtering Set { "date", "customer" }
  const visibleColumnKeys = useMemo(
    () => new Set(columns.filter((col) => col.visible).map((col) => col.key)),
    [columns],
  )

  // Check if a specific column is visible
  const isColumnVisible = useCallback((key: string) => visibleColumnKeys.has(key), [visibleColumnKeys])

  return {
    columns,
    toggleColumn,
    resetColumns,
    visibleColumnKeys,
    isColumnVisible,
  }
}
