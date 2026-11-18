import type { ReactNode } from "react"
import { cn } from "../lib/cn"

interface SplitLayoutProps {
    children: ReactNode
    art?: string
    artAlt?: string
    /** Lebar maks ilustrasi (px) */
    artWidth?: number
    /** Tampilkan ilustrasi juga di layar kecil (di bawah konten) */
    artOnMobile?: boolean
    className?: string
}

/** Layout utama Figma: konten di kiri (±556px), ilustrasi di kanan. */
export function SplitLayout({ children, art, artAlt = "", artWidth = 626, artOnMobile, className }: SplitLayoutProps) {
    return (
        <main
            className={cn(
                "mx-auto grid w-full max-w-[1300px] content-start items-start gap-10 lg:min-h-[calc(100svh-77px)] lg:content-center lg:items-center px-5 py-10 sm:px-10 lg:grid-cols-[minmax(0,556px)_minmax(0,1fr)] lg:py-14",
                className
            )}
        >
            <div className="min-w-0">{children}</div>
            {art && (
                <div className={cn("justify-center lg:flex", artOnMobile ? "flex" : "hidden")}>
                    <img
                        src={art}
                        alt={artAlt}
                        className={cn("h-auto w-full select-none", artOnMobile && "max-lg:max-w-[360px]")}
                        style={{ maxWidth: artWidth }}
                        draggable={false}
                    />
                </div>
            )}
        </main>
    )
}

/** Kolom tunggal di tengah (Certificate, Sessions, Wallet, dll) */
export function CenterLayout({ children, width = 556, className }: { children: ReactNode; width?: number; className?: string }) {
    return (
        <main className={cn("mx-auto w-full px-5 py-12 sm:px-10 lg:py-16", className)} style={{ maxWidth: width + 80 }}>
            {children}
        </main>
    )
}
