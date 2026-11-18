import { useState } from "react"
import { cn } from "../lib/cn"

interface AvatarProps {
    src?: string | null
    name?: string | null
    size?: number
    tone?: "sand" | "sage"
    className?: string
}

/** Avatar bulat; kalau tidak ada avatarUrl tampil siluet seperti di Figma. */
export function Avatar({ src, name, size = 50, tone = "sand", className }: AvatarProps) {
    const [failed, setFailed] = useState(false)
    const showImage = !!src && !failed

    return (
        <span
            className={cn(
                "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
                tone === "sage" ? "bg-sage" : "bg-sand",
                className
            )}
            style={{ width: size, height: size }}
        >
            {showImage ? (
                <img
                    src={src!}
                    alt={name ? `${name}'s avatar` : "Avatar"}
                    className="size-full object-cover"
                    onError={() => setFailed(true)}
                />
            ) : (
                <svg viewBox="0 0 100 100" className="size-full" role="img" aria-label={name ?? "Avatar"}>
                    <circle cx="50" cy="40" r="15" fill="#191915" />
                    <path d="M23 76c0-14 12-22 27-22s27 8 27 22v1.5a3.5 3.5 0 0 1-3.5 3.5h-47A3.5 3.5 0 0 1 23 77.5z" fill="#191915" />
                </svg>
            )}
        </span>
    )
}
