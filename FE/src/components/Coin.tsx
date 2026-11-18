import { Link } from "react-router-dom"
import { cn } from "../lib/cn"

export function CoinDot({ size = 18 }: { size?: number }) {
    return (
        <span
            aria-hidden
            className="inline-block shrink-0 rounded-full border-2 border-sun-soft bg-sun"
            style={{ width: size, height: size }}
        />
    )
}

/** Pill "● 60 coins" (olive) seperti di Home */
export function CoinPill({ coins, to, className }: { coins: number; to?: string; className?: string }) {
    const classes = cn(
        "inline-flex h-[34px] items-center gap-2 rounded-full bg-olive pr-4 pl-3 text-[14px] font-medium text-pampas",
        to && "transition hover:brightness-110",
        className
    )
    const body = (
        <>
            <CoinDot />
            {coins.toLocaleString("en-US")} coins
        </>
    )
    return to ? (
        <Link to={to} className={classes}>
            {body}
        </Link>
    ) : (
        <span className={classes}>{body}</span>
    )
}
