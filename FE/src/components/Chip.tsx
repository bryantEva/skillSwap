import type { ReactNode } from "react"
import { cn } from "../lib/cn"
import { tintBg, type Tint } from "../lib/tints"

interface ChipProps {
    tint: Tint
    size?: "sm" | "md" | "lg"
    icon?: ReactNode
    children: ReactNode
    onRemove?: () => void
    onClick?: () => void
    active?: boolean
    title?: string
}

const sizes = {
    sm: "h-[26px] px-3 text-[12px]",
    md: "h-[30px] px-3.5 text-[13px]",
    lg: "h-[45px] px-5 text-[15px]"
}

export function Chip({ tint, size = "md", icon, children, onRemove, onClick, active, title }: ChipProps) {
    const classes = cn(
        "inline-flex items-center gap-2 rounded-full font-medium whitespace-nowrap text-pampas",
        tintBg[tint],
        sizes[size],
        onClick && "cursor-pointer transition hover:brightness-125",
        active && "ring-2 ring-ink ring-offset-2 ring-offset-cream"
    )

    const content = (
        <>
            {icon != null && <span aria-hidden className="text-[0.9em] leading-none opacity-90">{icon}</span>}
            <span>{children}</span>
            {onRemove && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation()
                        onRemove()
                    }}
                    className="-mr-1 ml-0.5 grid size-5 cursor-pointer place-items-center rounded-full text-[14px] leading-none text-pampas/70 hover:bg-white/15 hover:text-pampas"
                    aria-label={`Remove ${typeof children === "string" ? children : "item"}`}
                >
                    ×
                </button>
            )}
        </>
    )

    if (onClick) {
        return (
            <button type="button" onClick={onClick} className={classes} aria-pressed={active} title={title}>
                {content}
            </button>
        )
    }
    return (
        <span className={classes} title={title}>
            {content}
        </span>
    )
}
