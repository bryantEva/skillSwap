import { useNavigate } from "react-router-dom"
import { cn } from "../lib/cn"

/** "← Back" — kembali ke halaman sebelumnya, atau ke `fallback` kalau tidak ada history. */
export function BackLink({ fallback = "/home", className }: { fallback?: string; className?: string }) {
    const navigate = useNavigate()
    return (
        <button
            type="button"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(fallback))}
            className={cn("inline-flex cursor-pointer items-center gap-1 text-[15px] font-medium hover:underline", className)}
        >
            <span aria-hidden>←</span> Back
        </button>
    )
}
