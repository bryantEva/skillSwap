import { useCallback, useEffect, useRef, useState, type DependencyList } from "react"

interface AsyncState<T> {
    data: T | undefined
    error: Error | null
    loading: boolean
    reload: () => void
    setData: (updater: T | ((prev: T | undefined) => T)) => void
}

/** Jalankan fungsi async saat deps berubah, dengan state loading/error. */
export function useAsync<T>(fn: () => Promise<T>, deps: DependencyList): AsyncState<T> {
    const [data, setDataState] = useState<T | undefined>(undefined)
    const [error, setError] = useState<Error | null>(null)
    const [loading, setLoading] = useState(true)
    const [tick, setTick] = useState(0)
    const fnRef = useRef(fn)
    fnRef.current = fn

    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError(null)
        fnRef
            .current()
            .then((result) => {
                if (!cancelled) setDataState(result)
            })
            .catch((err: unknown) => {
                if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)))
            })
            .finally(() => {
                if (!cancelled) setLoading(false)
            })
        return () => {
            cancelled = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [...deps, tick])

    const reload = useCallback(() => setTick((t) => t + 1), [])
    const setData = useCallback((updater: T | ((prev: T | undefined) => T)) => {
        setDataState((prev) =>
            typeof updater === "function" ? (updater as (p: T | undefined) => T)(prev) : updater
        )
    }, [])

    return { data, error, loading, reload, setData }
}
