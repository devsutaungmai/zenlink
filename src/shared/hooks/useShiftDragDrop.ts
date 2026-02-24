import { useState, useCallback, useRef } from 'react'
import { ShiftWithRelations } from '@/types/schedule'

export interface DragData {
  shiftId: string
  shift: ShiftWithRelations
  sourceRowId: string
  sourceDate: string
}

export interface DropTarget {
  rowId: string
  date: string
  rowType: 'employee' | 'group' | 'function' | 'open'
}

interface UseShiftDragDropOptions {
  onMoveShift: (shiftId: string, target: { date?: string; employeeId?: string; employeeGroupId?: string; functionId?: string }) => Promise<void>
  onDuplicateShift: (shiftId: string, targets: Array<{ date?: string; employeeId?: string; employeeGroupId?: string; functionId?: string }>) => Promise<void>
  canEditShifts: boolean
  isDropDisabled?: (targetRowId: string, targetDate: string, shift?: ShiftWithRelations) => boolean
  onDropRejected?: (targetRowId: string, targetDate: string, shift?: ShiftWithRelations) => void
}

export function useShiftDragDrop({ onMoveShift, onDuplicateShift, canEditShifts, isDropDisabled, onDropRejected }: UseShiftDragDropOptions) {
  const [dragOverCell, setDragOverCell] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [copyMode, setCopyMode] = useState(false)
  const dragDataRef = useRef<DragData | null>(null)

  const toggleCopyMode = useCallback(() => {
    setCopyMode(prev => !prev)
  }, [])

  const handleDragStart = useCallback((
    e: React.DragEvent,
    shift: ShiftWithRelations,
    sourceRowId: string,
    sourceDate: string
  ) => {
    if (!canEditShifts) {
      e.preventDefault()
      return
    }

    const dragData: DragData = {
      shiftId: shift.id,
      shift,
      sourceRowId,
      sourceDate,
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
  }, [canEditShifts])

  const handleDragOver = useCallback((e: React.DragEvent, cellId: string, rowId?: string, date?: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (rowId !== undefined && date && isDropDisabled?.(rowId, date, dragDataRef.current?.shift)) {
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
    targetDate: string,
    rowType: 'employee' | 'group' | 'function' | 'open'
  ) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOverCell(null)
    setIsDragging(false)

    const dragData = dragDataRef.current
    if (!dragData) return

    if (isDropDisabled?.(targetRowId, targetDate, dragData.shift)) {
      onDropRejected?.(targetRowId, targetDate, dragData.shift)
      dragDataRef.current = null
      return
    }

    const sameCell = dragData.sourceRowId === targetRowId && dragData.sourceDate === targetDate

    if (sameCell && !copyMode) {
      dragDataRef.current = null
      return
    }

    const target: any = { date: targetDate }
    if (rowType === 'employee' && targetRowId) {
      target.employeeId = targetRowId
    } else if (rowType === 'group' && targetRowId) {
      target.employeeGroupId = targetRowId
    } else if (rowType === 'function' && targetRowId) {
      target.functionId = targetRowId
    } else if (rowType === 'open') {
      target.employeeId = null
    }

    try {
      if (copyMode) {
        await onDuplicateShift(dragData.shiftId, [target])
      } else {
        await onMoveShift(dragData.shiftId, target)
      }
    } catch (error) {
      console.error('Failed to move/copy shift:', error)
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
