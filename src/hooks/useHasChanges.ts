import { useState, useEffect } from 'react'

export function useHasChanges<T>(data: T) {
  const [originalData, setOriginalData] = useState<T>(data)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    setHasChanges(JSON.stringify(data) !== JSON.stringify(originalData))
  }, [data, originalData])

  const resetChanges = () => {
    setOriginalData(data)
    setHasChanges(false)
  }

  const setInitialData = (newData: T) => {
    setOriginalData(newData)
    setHasChanges(false)
  }

  return {
    hasChanges,
    resetChanges,
    setInitialData,
  }
}