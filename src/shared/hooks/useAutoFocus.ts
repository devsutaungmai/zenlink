import { useEffect, useRef } from 'react'

export function useAutoFocus<T extends HTMLElement>() {
    const ref = useRef<T>(null)

    useEffect(() => {
        ref.current?.focus()
    }, [])

    return ref
}