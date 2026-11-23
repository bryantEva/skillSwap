import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { art } from "../assets/illustrations"
import { Avatar } from "../components/Avatar"
import { CoinPill } from "../components/Coin"
import { EmptyCard, ErrorBlock, Notice, Spinner } from "../components/Feedback"
import { SplitLayout } from "../components/SplitLayout"
import { useAuth, useCurrentUser } from "../context/AuthContext"
import { useAsync } from "../hooks/useAsync"
import { api } from "../lib/api"
import { cn } from "../lib/cn"
import { displayName, firstName, formatSlot, greeting, plural } from "../lib/format"
import { tintBg, tintFor, type Tint } from "../lib/tints"
import type { Session } from "../types"

const QUICK_ACTIONS: Array<{ to: string; title: string; text: string; glyph: string; tint: Tint }> = [
    { to: "/browse", title: "Browse Skills", text: "Find your next learning opportunity", glyph: "⌕", tint: "navy" },
    { to: "/sessions?filter=swaps", title: "My Swaps", text: "View your active requests", glyph: "⇄", tint: "forest" },
    { to: "/sessions", title: "My Sessions", text: "See your upcoming sessions", glyph: "▦", tint: "olive" },
    { to: "/certificates", title: "Certificates", text: "Track your achievements", glyph: "✓", tint: "plum" }
]

function IconSquare({ tint, glyph }: { tint: Tint; glyph: string }) {
    return (
        <span className={cn("grid size-[52px] shrink-0 place-items-center rounded-xl text-[20px] text-pampas", tintBg[tint])}>
            {glyph}
        </span>
    )
}

export default function Home() {
    const me = useCurrentUser()
    const { patchUser } = useAuth()

    const sessions = useAsync(() => api.getSessions(me.id), [me.id])
    const tx = useAsync(() => api.getCoinTransactions(me.id), [me.id])

    const [claiming, setClaiming] = useState(false)
    const [claimMsg, setClaimMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null)

    const claimedToday = useMemo(() => {
        if (!tx.data) return true // sembunyikan tombol sampai data ada
        const start = new Date()
        start.setHours(0, 0, 0, 0)
        return tx.data.some((t) => t.type === "DAILY_LOGIN" && new Date(t.createdAt) >= start)
    }, [tx.data])

    const claimDaily = async () => {
        setClaiming(true)
        setClaimMsg(null)
        try {
            const res = await api.claimDaily(me.id)
            patchUser({ coins: res.coins })
            setClaimMsg({ tone: "success", text: res.message })
            tx.reload()
        } catch (err) {
            setClaimMsg({ tone: "error", text: (err as Error).message })
        } finally {
            setClaiming(false)
        }
    }

    const { learning, next, reviewable } = useMemo(() => summarize(sessions.data ?? [], me.id), [sessions.data, me.id])

    return (
        <SplitLayout art={art.home} artAlt="Illustration of a learner taking a game break">
            {/* Greeting */}
            <div className="flex items-center gap-5">
                <Avatar src={me.avatarUrl} name={me.name} size={104} tone="sage" className="max-sm:!size-20" />
                <div className="min-w-0">
                    <h1 className="font-display text-[28px] leading-[1.15] font-bold tracking-[-0.03em] sm:text-[32px]">
                        {greeting()}, {firstName(me.name, "friend")}
                    </h1>
                    <p className="mt-1 text-[17px] leading-6.25 text-muted">Keep going! You're one step closer to your goals.</p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-2">
                        <CoinPill coins={me.coins ?? 0} to="/wallet" />
                        {!claimedToday && (
                            <button
                                type="button"
                                onClick={claimDaily}
                                disabled={claiming}
                                className="inline-flex h-8.5 cursor-pointer items-center gap-1.5 rounded-full border border-olive/40 px-3.5 text-[13px] font-medium text-olive transition hover:bg-pampas disabled:opacity-60"
                            >
                                {claiming ? <Spinner className="size-3.5" /> : "+10"} Claim daily coins
                            </button>
                        )}
                    </div>
                </div>
            </div>
            {claimMsg && (
                <Notice tone={claimMsg.tone} className="mt-4">
                    {claimMsg.text}
                </Notice>
            )}

            {sessions.error ? (
                <div className="mt-8">
                    <ErrorBlock error={sessions.error} onRetry={sessions.reload} />
                </div>
            ) : (
                <>
                    {/* Your learning */}
                    <h2 className="title-section mt-8 mb-3">Your learning</h2>
                    {sessions.loading && !sessions.data ? (
                        <SkeletonCard />
                    ) : learning.length === 0 ? (
                        <EmptyCard
                            title="Nothing in progress yet"
                            text="Find someone to learn from and book your first session."
                            action={
                                <Link to="/browse" className="btn-light">
                                    Find a skill →
                                </Link>
                            }
                        />
                    ) : (
                        <div className="flex flex-col gap-2.5">
                            {learning.slice(0, 2).map((l) => {
                                const pct = Math.round((l.completed / l.total) * 100)
                                return (
                                    <div key={l.skillId} className="card-dark flex items-center gap-3.5 p-[17px]">
                                        <IconSquare tint={tintFor(l.skillName)} glyph="✎" />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-baseline justify-between gap-3">
                                                <p className="truncate font-display text-[16px] font-semibold">{l.skillName}</p>
                                                <p className="font-display text-[16px] font-semibold">{pct}%</p>
                                            </div>
                                            <p className="text-[14px] text-dim">
                                                {l.completed} / {plural(l.total, "session")}
                                            </p>
                                            <div className="mt-2 h-1.5 w-full max-w-[400px] overflow-hidden rounded-full bg-card-2">
                                                <div className="h-full rounded-full bg-lilac transition-[width]" style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Next session */}
                    <h2 className="title-section mt-6 mb-3">Next session</h2>
                    {sessions.loading && !sessions.data ? (
                        <SkeletonCard />
                    ) : (
                        <div className="flex flex-col gap-2.5">
                            {next ? (
                                <SessionRow
                                    session={next}
                                    meId={me.id}
                                    title={formatSlot(next.scheduledAt)}
                                    action={
                                        <Link to="/sessions" className="btn-light h-[37px]">
                                            View session →
                                        </Link>
                                    }
                                />
                            ) : !reviewable ? (
                                <EmptyCard
                                    title="No upcoming sessions"
                                    text="Request a swap or book a paid session."
                                    action={
                                        <Link to="/browse" className="btn-light">
                                            Browse skills →
                                        </Link>
                                    }
                                />
                            ) : null}
                            {reviewable && (
                                <SessionRow
                                    session={reviewable}
                                    meId={me.id}
                                    title={`${reviewable.skill.name} · Completed`}
                                    action={
                                        <Link to={`/sessions/${reviewable.id}/review`} className="btn-light h-[37px]">
                                            Leave a review →
                                        </Link>
                                    }
                                />
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Quick actions */}
            <h2 className="title-section mt-6 mb-3">Quick actions</h2>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {QUICK_ACTIONS.map((a) => (
                    <Link
                        key={a.title}
                        to={a.to}
                        className="card-dark flex min-h-[118px] flex-col p-3 transition hover:-translate-y-0.5 hover:border-card-2"
                    >
                        <span className={cn("grid size-[34px] place-items-center rounded-full text-[15px] text-pampas", tintBg[a.tint])}>
                            {a.glyph}
                        </span>
                        <span className="mt-auto pt-3 text-[13px] leading-4 font-semibold">{a.title}</span>
                        <span className="mt-0.5 text-[11px] leading-[14px] text-dim">{a.text}</span>
                    </Link>
                ))}
            </div>
        </SplitLayout>
    )
}

function SessionRow({
    session,
    meId,
    title,
    action
}: {
    session: Session
    meId: number
    title: string
    action: React.ReactNode
}) {
    const other = session.teacherId === meId ? session.student : session.teacher
    const role = session.teacherId === meId ? "teaching" : "learning"
    return (
        <div className="card-dark flex flex-wrap items-center gap-3.5 p-[17px]">
            <IconSquare tint="navy" glyph="▦" />
            <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[16px] font-semibold">{title}</p>
                <p className="truncate text-[14px] text-dim">
                    with {displayName(other.name)} · {role} {session.skill.name}
                </p>
            </div>
            {action}
        </div>
    )
}

function SkeletonCard() {
    return <div className="card-dark h-[86px] animate-pulse opacity-80" />
}

function summarize(sessions: Session[], meId: number) {
    const bySkill = new Map<number, { skillId: number; skillName: string; total: number; completed: number; last: number }>()
    for (const s of sessions) {
        if (s.studentId !== meId || s.status === "CANCELLED") continue
        const entry = bySkill.get(s.skill.id) ?? { skillId: s.skill.id, skillName: s.skill.name, total: 0, completed: 0, last: 0 }
        entry.total += 1
        if (s.status === "COMPLETED") entry.completed += 1
        entry.last = Math.max(entry.last, new Date(s.scheduledAt).getTime())
        bySkill.set(s.skill.id, entry)
    }
    const learning = [...bySkill.values()].sort((a, b) => b.last - a.last)

    const active = sessions
        .filter((s) => s.status === "PENDING" || s.status === "CONFIRMED" || s.status === "ONGOING")
        .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    const now = Date.now() - 2 * 60 * 60 * 1000
    const next = active.find((s) => new Date(s.scheduledAt).getTime() >= now) ?? active[0] ?? null

    const reviewable =
        sessions
            .filter((s) => s.status === "COMPLETED" && !s.ratings.some((r) => r.reviewerId === meId))
            .sort((a, b) => new Date(b.completedAt ?? b.updatedAt).getTime() - new Date(a.completedAt ?? a.updatedAt).getTime())[0] ??
        null

    return { learning, next, reviewable }
}
