import { useState, useCallback, useRef } from 'react'

export interface TemplateDragData {
  shiftId: string
  shift: any
  sourceRowId: string
  sourceDayIndex: number
}

export interface TemplateDropTarget {
  rowId: string
  dayIndex: number
  rowType: 'employee' | 'group' | 'function' | 'openEmployee' | 'openGroup' | 'openFunction'
}

type TemplateRowType = 'employee' | 'group' | 'function' | 'openEmployee' | 'openGroup' | 'openFunction'

interface UseTemplateDragDropOptions {
  onMoveShift: (shiftId: string, target: { dayIndex: number; employeeId?: string | null; employeeGroupId?: string | null; functionId?: string | null }) => Promise<void>
  onDuplicateShift: (shiftId: string, target: { dayIndex: number; employeeId?: string | null; employeeGroupId?: string | null; functionId?: string | null }) => Promise<void>
  isDropDisabled?: (targetRowId: string, targetDayIndex: number, rowType: TemplateRowType, shift?: any) => boolean
  onDropRejected?: (targetRowId: string, targetDayIndex: number, rowType: TemplateRowType, shift?: any) => void
}

export function useTemplateDragDrop({ onMoveShift, onDuplicateShift, isDropDisabled, onDropRejected }: UseTemplateDragDropOptions) {
  const [dragOverCell, setDragOverCell] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [copyMode, setCopyMode] = useState(false)
  const dragDataRef = useRef<TemplateDragData | null>(null)

  const toggleCopyMode = useCallback(() => {
    setCopyMode(prev => !prev)
  }, [])

  const handleDragStart = useCallback((
    e: React.DragEvent,
    shift: any,
    sourceRowId: string,
    sourceDayIndex: number
  ) => {
    const dragData: TemplateDragData = {
      shiftId: shift.id,
      shift,
      sourceRowId,
      sourceDayIndex,
    }

    dragDataRef.current = dragData
    e.dataTransfer.setData('text/plain', shift.id)
    e.dataTransfer.effectAllowed = 'move'
    setIsDragging(true)

    const el = e.currentTarget as HTMLElement
    const ghost = el.cloneNode(true) as HTMLElement
    ghost.style.width = `${el.offsetWidth}px`
    ghost.style.opacity = '0.8'
    ghost.style.transform = 'rotate(2deg)'
    ghost.style.position = 'absolute'
    ghost.style.left = '-9999px'
    document.body.appendChild(ghost)
    e.dataTransfer.setDragImage(ghost, el.offsetWidth / 2, 20)
    requestAnimationFrame(() => ghost.remove())
  }, [])

  const handleDragOver = useCallback((
    e: React.DragEvent,
    cellId: string,
    targetRowId?: string,
    targetDayIndex?: number,
    rowType?: TemplateRowType
  ) => {
    e.preventDefault()
    e.stopPropagation()
    if (
      targetRowId !== undefined &&
      targetDayIndex !== undefined &&
      rowType &&
      isDropDisabled?.(targetRowId, targetDayIndex, rowType, dragDataRef.current?.shift)
    ) {
      setDragOverCell(null)
      return
    }
    e.dataTransfer.dropEffect = 'move'
    setDragOverCell(cellId)
  }, [isDropDisabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const relatedTarget = e.relatedTarget as HTMLElement
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverCell(null)
    }
  }, [])

  const handleDrop = useCallback(async (
    e: React.DragEvent,
    targetRowId: string,
    targetDayIndex: number,
    rowType: TemplateRowType
  ) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverCell(null)
    setIsDragging(false)

    const dragData = dragDataRef.current
    if (!dragData) return

    if (isDropDisabled?.(targetRowId, targetDayIndex, rowType, dragData.shift)) {
      onDropRejected?.(targetRowId, targetDayIndex, rowType, dragData.shift)
      dragDataRef.current = null
      return
    }

    const sameCell = dragData.sourceRowId === targetRowId && dragData.sourceDayIndex === targetDayIndex

    if (sameCell && !copyMode) {
      dragDataRef.current = null
      return
    }

    const target: any = { dayIndex: targetDayIndex }
    if (rowType === 'employee') {
      target.employeeId = targetRowId
    } else if (rowType === 'group') {
      target.employeeGroupId = targetRowId
    } else if (rowType === 'function') {
      target.functionId = targetRowId
    } else if (rowType === 'openEmployee') {
      target.employeeId = null
    } else if (rowType === 'openGroup') {
      target.employeeGroupId = null
    } else if (rowType === 'openFunction') {
      target.functionId = null
    }

    try {
      if (copyMode) {
        await onDuplicateShift(dragData.shiftId, target)
      } else {
        await onMoveShift(dragData.shiftId, target)
      }
    } catch (error) {
      console.error('Failed to move/copy template shift:', error)
    }

    dragDataRef.current = null
  }, [onMoveShift, onDuplicateShift, copyMode, isDropDisabled, onDropRejected])

  const handleDragEnd = useCallback(() => {
    setDragOverCell(null)
    setIsDragging(false)
    dragDataRef.current = null
  }, [])

  return {
    dragOverCell,
    isDragging,
    copyMode,
    toggleCopyMode,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd
  }
}
