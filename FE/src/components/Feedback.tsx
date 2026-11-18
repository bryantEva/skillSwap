import type { ReactNode } from "react"
import { cn } from "../lib/cn"

export function Spinner({ className }: { className?: string }) {
    return (
        <span
            role="status"
            aria-label="Loading"
            className={cn("inline-block size-5 animate-spin rounded-full border-2 border-current border-r-transparent", className)}
        />
    )
}

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
    return (
        <div className="flex items-center gap-3 py-10 text-[15px] text-muted">
            <Spinner /> {label}
        </div>
    )
}

export function Notice({
    tone = "info",
    children,
    className
}: {
    tone?: "info" | "success" | "error"
    children: ReactNode
    className?: string
}) {
    return (
        <div
            role={tone === "error" ? "alert" : "status"}
            className={cn(
                "rounded-xl px-4 py-3 text-[14px] leading-5",
                tone === "error" && "bg-[#f6e3df] text-[#7a2b20]",
                tone === "success" && "bg-forest text-mint",
                tone === "info" && "bg-pampas text-ink",
                className
            )}
        >
            {children}
        </div>
    )
}

export function ErrorBlock({ error, onRetry }: { error: Error; onRetry?: () => void }) {
    return (
        <Notice tone="error" className="flex flex-wrap items-center justify-between gap-3">
            <span>{error.message}</span>
            {onRetry && (
                <button type="button" onClick={onRetry} className="cursor-pointer font-medium underline">
                    Try again
                </button>
            )}
        </Notice>
    )
}

/** Kartu gelap kosong dengan aksi */
export function EmptyCard({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
    return (
        <div className="card-dark flex flex-wrap items-center justify-between gap-4 px-5 py-5">
            <div>
                <p className="font-display text-[16px] font-semibold">{title}</p>
                {text && <p className="mt-0.5 text-[14px] text-dim">{text}</p>}
            </div>
            {action}
        </div>
    )
}
