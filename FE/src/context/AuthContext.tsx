import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { api, setUnauthorizedHandler, tokenStore } from "../lib/api"
import type { AuthUser } from "../types"

const USER_KEY = "skillswap.user"

interface AuthContextValue {
    user: AuthUser | null
    isAuthenticated: boolean
    login: (email: string, password: string) => Promise<AuthUser>
    register: (name: string, email: string, password: string) => Promise<AuthUser>
    logout: () => void
    /** Ambil ulang profil (misal setelah koin berubah) */
    refreshUser: () => Promise<void>
    /** Update cepat sebagian data user di state lokal */
    patchUser: (patch: Partial<AuthUser>) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readStoredUser(): AuthUser | null {
    try {
        const raw = localStorage.getItem(USER_KEY)
        return raw ? (JSON.parse(raw) as AuthUser) : null
    } catch {
        return null
    }
}

function storeUser(user: AuthUser | null) {
    try {
        if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
        else localStorage.removeItem(USER_KEY)
    } catch {
        /* storage tidak tersedia */
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(() => (tokenStore.get() ? readStoredUser() : null))

    const applyUser = useCallback((next: AuthUser | null) => {
        setUser(next)
        storeUser(next)
    }, [])

    const logout = useCallback(() => {
        tokenStore.clear()
        applyUser(null)
    }, [applyUser])

    useEffect(() => {
        setUnauthorizedHandler(logout)
        return () => setUnauthorizedHandler(null)
    }, [logout])

    const login = useCallback(
        async (email: string, password: string) => {
            const res = await api.login(email, password)
            tokenStore.set(res.token)
            applyUser(res.user)
            return res.user
        },
        [applyUser]
    )

    const register = useCallback(
        async (name: string, email: string, password: string) => {
            await api.register(name, email, password)
            // BE tidak mengembalikan token saat register, jadi langsung login
            return login(email, password)
        },
        [login]
    )

    const refreshUser = useCallback(async () => {
        if (!user) return
        const profile = await api.getUser(user.id)
        applyUser({
            id: profile.id,
            email: profile.email,
            name: profile.name,
            avatarUrl: profile.avatarUrl,
            coins: profile.coins
        })
    }, [user, applyUser])

    const patchUser = useCallback(
        (patch: Partial<AuthUser>) => {
            setUser((prev) => {
                if (!prev) return prev
                const next = { ...prev, ...patch }
                storeUser(next)
                return next
            })
        },
        []
    )

    // Sinkronkan data user (koin dll) setiap app dibuka
    useEffect(() => {
        if (user) refreshUser().catch(() => {})
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id])

    const value = useMemo<AuthContextValue>(
        () => ({ user, isAuthenticated: !!user, login, register, logout, refreshUser, patchUser }),
        [user, login, register, logout, refreshUser, patchUser]
    )

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error("useAuth harus dipakai di dalam <AuthProvider>")
    return ctx
}

/** Untuk halaman yang sudah dibungkus <RequireAuth>, user pasti ada. */
export function useCurrentUser(): AuthUser {
    const { user } = useAuth()
    if (!user) throw new Error("User belum login")
    return user
}
