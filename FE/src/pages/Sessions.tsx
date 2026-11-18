import { useMemo, useState } from "react"
import { Link, useLocation, useSearchParams } from "react-router-dom"
import { Avatar } from "../components/Avatar"
import { CoinDot } from "../components/Coin"
import { EmptyCard, ErrorBlock, LoadingBlock, Notice, Spinner } from "../components/Feedback"
import { CenterLayout } from "../components/SplitLayout"
import { useAuth, useCurrentUser } from "../context/AuthContext"
import { useAsync } from "../hooks/useAsync"
import { api } from "../lib/api"
import { cn } from "../lib/cn"
import { displayName, formatShortDateTime, statusLabel } from "../lib/format"
import { tintBg, tintFor } from "../lib/tints"
import type { Session, SessionStatus } from "../types"

type Filter = "all" | "upcoming" | "swaps" | "paid" | "completed"

const FILTERS: Array<{ id: Filter; label: string }> = [
    { id: "all", label: "All" },
    { id: "upcoming", label: "Upcoming" },
    { id: "swaps", label: "Swaps" },
    { id: "paid", label: "Paid" },
    { id: "completed", label: "Completed" }
]

const statusStyle: Record<SessionStatus, string> = {
    PENDING: "bg-olive text-pampas",
    ONGOING: "bg-navy text-pampas",
    COMPLETED: "bg-forest text-mint",
    CANCELLED: "bg-maroon text-[#f3c9c0]"
}

const isActive = (s: Session) => s.status === "PENDING" || s.status === "ONGOING"

export default function Sessions() {
    const me = useCurrentUser()
    const { refreshUser } = useAuth()
    const location = useLocation()
    const [params, setParams] = useSearchParams()
    const filter = (FILTERS.find((f) => f.id === params.get("filter"))?.id ?? "all") as Filter

    const sessions = useAsync(() => api.getSessions(me.id), [me.id])
    const [flash, setFlash] = useState<{ tone: "success" | "error"; text: string } | null>(() => {
        const msg = (location.state as { flash?: string } | null)?.flash
        return msg ? { tone: "success", text: msg } : null
    })
    const [busyId, setBusyId] = useState<number | null>(null)

    const list = useMemo(() => {
        const all = sessions.data ?? []
        const filtered = all.filter((s) => {
            if (filter === "upcoming") return isActive(s)
            if (filter === "swaps") return s.type === "TWO_WAY"
            if (filter === "paid") return s.type === "ONE_WAY"
            if (filter === "completed") return s.status === "COMPLETED"
            return true
        })
        const time = (s: Session) => new Date(s.scheduledAt).getTime()
        return {
            active: filtered.filter(isActive).sort((a, b) => time(a) - time(b)),
            past: filtered.filter((s) => !isActive(s)).sort((a, b) => time(b) - time(a))
        }
    }, [sessions.data, filter])

    const changeStatus = async (s: Session, status: "ONGOING" | "COMPLETED" | "CANCELLED") => {
        const confirmText: Record<typeof status, string | null> = {
            ONGOING: null,
            COMPLETED: `Tandai sesi ${s.skill.name} sebagai selesai?${s.type === "ONE_WAY" ? ` ${s.coinAmount} koin akan dikirim ke pengajar.` : ""}`,
            CANCELLED: `Batalkan sesi ${s.skill.name}?${s.type === "ONE_WAY" ? " Koin di escrow akan dikembalikan ke student." : ""}`
        }
        const text = confirmText[status]
        if (text && !window.confirm(text)) return

        setBusyId(s.id)
        setFlash(null)
        try {
            const res = await api.updateSessionStatus(s.id, status)
            setFlash({ tone: "success", text: res.message })
            sessions.reload()
            refreshUser().catch(() => {})
        } catch (err) {
            setFlash({ tone: "error", text: (err as Error).message })
        } finally {
            setBusyId(null)
        }
    }

    const total = list.active.length + list.past.length

    return (
        <CenterLayout width={720}>
            <h1 className="title-xl">My Sessions</h1>
            <p className="mt-3 text-[17px] leading-[25px] text-muted">Your swaps and paid sessions, all in one place.</p>

            <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Filter sessions">
                {FILTERS.map((f) => (
                    <button
                        key={f.id}
                        type="button"
                        role="tab"
                        aria-selected={filter === f.id}
                        onClick={() => setParams(f.id === "all" ? {} : { filter: f.id }, { replace: true })}
                        className={cn(
                            "h-10 cursor-pointer rounded-full border px-5 text-[14px] transition-colors",
                            filter === f.id ? "border-pampas bg-pampas font-medium" : "border-ink hover:bg-pampas"
                        )}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            {flash && (
                <Notice tone={flash.tone} className="mt-4">
                    {flash.text}
                </Notice>
            )}

            <div className="mt-5">
                {sessions.error ? (
                    <ErrorBlock error={sessions.error} onRetry={sessions.reload} />
                ) : sessions.loading && !sessions.data ? (
                    <LoadingBlock />
                ) : total === 0 ? (
                    <EmptyCard
                        title="No sessions here yet"
                        text="Find someone to swap skills with or book a paid session."
                        action={
                            <Link to="/browse" className="btn-light">
                                Browse skills →
                            </Link>
                        }
                    />
                ) : (
                    <div className="flex flex-col gap-7">
                        {list.active.length > 0 && (
                            <section>
                                <h2 className="title-section mb-3">Upcoming</h2>
                                <div className="flex flex-col gap-2.5">
                                    {list.active.map((s) => (
                                        <SessionCard key={s.id} s={s} meId={me.id} busy={busyId === s.id} onStatus={changeStatus} />
                                    ))}
                                </div>
                            </section>
                        )}
                        {list.past.length > 0 && (
                            <section>
                                <h2 className="title-section mb-3">Past</h2>
                                <div className="flex flex-col gap-2.5">
                                    {list.past.map((s) => (
                                        <SessionCard key={s.id} s={s} meId={me.id} busy={busyId === s.id} onStatus={changeStatus} />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </div>
        </CenterLayout>
    )
}

function SessionCard({
    s,
    meId,
    busy,
    onStatus
}: {
    s: Session
    meId: number
    busy: boolean
    onStatus: (s: Session, status: "ONGOING" | "COMPLETED" | "CANCELLED") => void
}) {
    const iTeach = s.teacherId === meId
    const other = iTeach ? s.student : s.teacher
    const rated = s.ratings.some((r) => r.reviewerId === meId)

    return (
        <article className="card-dark p-[17px]">
            <div className="flex flex-wrap items-center gap-3.5">
                <span
                    className={cn(
                        "grid size-[52px] shrink-0 place-items-center rounded-xl text-[20px] text-pampas",
                        tintBg[tintFor(s.skill.name)]
                    )}
                    aria-hidden
                >
                    {s.type === "TWO_WAY" ? "⇄" : <CoinDot size={20} />}
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-display text-[16px] font-semibold">{s.skill.name}</p>
                        <span className={cn("inline-flex h-[22px] items-center rounded-full px-2.5 text-[11px] font-medium", statusStyle[s.status])}>
                            {statusLabel[s.status]}
                        </span>
                    </div>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[14px] text-dim">
                        <Avatar src={other.avatarUrl} name={other.name} size={18} />
                        <span className="truncate">
                            {iTeach ? "Teaching" : "Learning from"} {displayName(other.name)} · {formatShortDateTime(s.scheduledAt)}
                        </span>
                    </p>
                    <p className="text-[12px] text-dim">
                        {s.type === "TWO_WAY" ? "Skill swap" : `Paid session · ${s.coinAmount} coins${s.status === "PENDING" || s.status === "ONGOING" ? " in escrow" : ""}`}
                    </p>
                </div>

                <div className="flex flex-wrap gap-2">
                    {busy && <Spinner className="size-4 self-center text-pampas" />}
                    {s.status === "PENDING" && (
                        <>
                            <button type="button" disabled={busy} onClick={() => onStatus(s, "ONGOING")} className="btn-light">
                                Start
                            </button>
                            <button type="button" disabled={busy} onClick={() => onStatus(s, "CANCELLED")} className="btn-ghost-dark">
                                Cancel
                            </button>
                        </>
                    )}
                    {s.status === "ONGOING" && (
                        <>
                            <button type="button" disabled={busy} onClick={() => onStatus(s, "COMPLETED")} className="btn-light">
                                Mark complete
                            </button>
                            <button type="button" disabled={busy} onClick={() => onStatus(s, "CANCELLED")} className="btn-ghost-dark">
                                Cancel
                            </button>
                        </>
                    )}
                    {s.status === "COMPLETED" && (
                        <>
                            {!rated && (
                                <Link to={`/sessions/${s.id}/review`} className="btn-light">
                                    Leave a review →
                                </Link>
                            )}
                            {!iTeach && s.certificate && (
                                <Link to={`/sessions/${s.id}/certificate`} className={rated ? "btn-light" : "btn-ghost-dark"}>
                                    Certificate
                                </Link>
                            )}
                        </>
                    )}
                </div>
            </div>
        </article>
    )
}
