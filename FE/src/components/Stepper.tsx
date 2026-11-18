import { Fragment } from "react"
import { Link } from "react-router-dom"
import { cn } from "../lib/cn"

const STEPS = [
    { label: "Home", to: "/home" },
    { label: "Skill Setup", to: "/setup" },
    { label: "Match", to: "/browse" },
    { label: "Profile", to: "/profile" }
] as const

/** Alur 1 Home — 2 Skill Setup — 3 Match — 4 Profile (step aktif = lingkaran terang). */
export function Stepper({ active, profileTo }: { active: 1 | 2 | 3 | 4; profileTo?: string }) {
    return (
        <nav aria-label="Progress" className="flex flex-wrap items-center gap-x-2 gap-y-2">
            {STEPS.map((step, i) => {
                const n = i + 1
                const isActive = n === active
                const to = n === 4 && profileTo ? profileTo : step.to
                return (
                    <Fragment key={step.label}>
                        {i > 0 && <span aria-hidden className="h-px w-7 bg-ink" />}
                        <Link
                            to={to}
                            aria-current={isActive ? "step" : undefined}
                            className="group inline-flex items-center gap-2 text-[13px] leading-5"
                        >
                            <span
                                className={cn(
                                    "grid size-6 place-items-center rounded-full text-[11px] font-semibold",
                                    isActive ? "bg-pampas text-ink" : "bg-ink text-pampas"
                                )}
                            >
                                {n}
                            </span>
                            <span className={cn(isActive ? "font-semibold" : "group-hover:underline")}>{step.label}</span>
                        </Link>
                    </Fragment>
                )
            })}
        </nav>
    )
}
