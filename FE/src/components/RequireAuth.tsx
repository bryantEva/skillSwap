import { useState, type ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

export function RequireAuth({ children }: { children: ReactNode }) {
    const { isAuthenticated } = useAuth()
    const location = useLocation()
    if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
    }
    return <>{children}</>
}

/**
 * Halaman login/register: kalau SUDAH login saat membuka halaman, langsung ke /home.
 * (Status login yang berubah setelah submit tidak di-redirect di sini, supaya
 * halamannya sendiri yang menentukan tujuan, misal register → /setup.)
 */
export function GuestOnly({ children }: { children: ReactNode }) {
    const { isAuthenticated } = useAuth()
    const [wasAuthenticated] = useState(isAuthenticated)
    if (wasAuthenticated) return <Navigate to="/home" replace />
    return <>{children}</>
}
