import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { art } from "../assets/illustrations"
import { Avatar } from "../components/Avatar"
import { BackLink } from "../components/BackLink"
import { Chip } from "../components/Chip"
import { EmptyCard, ErrorBlock, LoadingBlock, Notice } from "../components/Feedback"
import { SplitLayout } from "../components/SplitLayout"
import { Stepper } from "../components/Stepper"
import { useCurrentUser } from "../context/AuthContext"
import { useAsync } from "../hooks/useAsync"
import { api } from "../lib/api"
import { cn } from "../lib/cn"
import { displayName, plural } from "../lib/format"
import { computeMatch, headline, type MatchResult } from "../lib/matching"
import { tintFor } from "../lib/tints"
import type { UserSkill } from "../types"

type Filter = "all" | "swap" | "paid"

const FILTERS: Array<{ id: Filter; label: string }> = [
    { id: "all", label: "All" },
    { id: "swap", label: "Skill Swap" },
    { id: "paid", label: "Paid" }
]

export default function Matches() {
    const me = useCurrentUser()
    const [filter, setFilter] = useState<Filter>("all")

    const data = useAsync(() => Promise.all([api.getUsers(), api.getUserSkills(me.id)]), [me.id])
    const users = data.data?.[0] ?? []
    const mySkills = data.data?.[1] ?? []

    const matches = useMemo(
        () =>
            users
                .filter((u) => u.id !== me.id && u.userSkills.some((s) => s.type === "OFFERING"))
                .map((u) => computeMatch(mySkills, u))
                .sort((a, b) => b.score - a.score || b.user.averageStars - a.user.averageStars),
        [users, mySkills, me.id]
    )

    const visible = matches.filter((m) => (filter === "swap" ? m.canSwap : filter === "paid" ? m.hasPaid : true))

    return (
        <SplitLayout art={art.matches} artAlt="Illustration of a learner watering plants" artWidth={528} className="lg:items-start">
            <BackLink />
            <div className="mt-5">
                <Stepper active={3} />
            </div>

            <h1 className="title-xl mt-7">Your Skill Matches</h1>
            <p className="mt-3 text-[17px] leading-[25px] text-muted">Find the right people to learn from and grow together.</p>

            <div className="mt-5 flex flex-wrap gap-2" role="tablist" aria-label="Filter matches">
                {FILTERS.map((f) => (
                    <button
                        key={f.id}
                        type="button"
                        role="tab"
                        aria-selected={filter === f.id}
                        onClick={() => setFilter(f.id)}
                        className={cn(
                            "h-10 cursor-pointer rounded-full border px-5 text-[14px] transition-colors",
                            filter === f.id ? "border-pampas bg-pampas font-medium" : "border-ink hover:bg-pampas"
                        )}
                    >
                        {f.label}
                    </button>
                ))}
            </div>

            <div className="mt-3 flex flex-col gap-2.5">
                {data.error ? (
                    <ErrorBlock error={data.error} onRetry={data.reload} />
                ) : data.loading ? (
                    <LoadingBlock label="Finding your matches…" />
                ) : (
                    <>
                        {mySkills.length === 0 && (
                            <Notice>
                                Tell us what you want to learn and teach to get better matches.{" "}
                                <Link to="/setup" className="font-medium underline">
                                    Set up skills →
                                </Link>
                            </Notice>
                        )}
                        {visible.length === 0 ? (
                            <EmptyCard
                                title={matches.length === 0 ? "No teachers yet" : "No matches for this filter"}
                                text={
                                    matches.length === 0
                                        ? "Be the first: add a skill you can teach."
                                        : "Try another filter or add more skills."
                                }
                                action={
                                    <Link to="/setup" className="btn-light">
                                        Update skills →
                                    </Link>
                                }
                            />
                        ) : (
                            visible.map((m, i) => <MatchCard key={m.user.id} match={m} featured={i === 0} />)
                        )}
                    </>
                )}
            </div>
        </SplitLayout>
    )
}

function SkillRow({ label, skills }: { label: string; skills: UserSkill[] }) {
    if (skills.length === 0) return null
    return (
        <div className="flex items-start gap-2">
            <span className="w-[88px] shrink-0 pt-1 text-[12px] whitespace-nowrap text-dim">{label}</span>
            <div className="flex flex-wrap gap-1.5">
                {skills.slice(0, 4).map((s) => (
                    <Chip key={s.id} tint={tintFor(s.skill.name)} size="sm">
                        {s.skill.name}
                    </Chip>
                ))}
                {skills.length > 4 && <span className="pt-1 text-[12px] text-dim">+{skills.length - 4}</span>}
            </div>
        </div>
    )
}

function MatchCard({ match, featured }: { match: MatchResult; featured: boolean }) {
    const { user, score, teaches, wants } = match
    return (
        <article className="card-dark p-[18px]">
            <div className="flex flex-wrap items-start gap-3.5">
                <Avatar src={user.avatarUrl} name={user.name} size={50} />
                <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-[17px] leading-6 font-semibold">
                        {displayName(user.name)}
                        {user.isVerified && <span className="ml-1.5 text-[13px] text-mint" title="Verified">✓</span>}
                    </h3>
                    <p className="truncate text-[13px] text-dim">{headline(user.userSkills)}</p>
                    <p className="text-[12px] text-dim">
                        {user.totalRatings > 0
                            ? `★ ${user.averageStars.toFixed(1)} · ${plural(user.totalRatings, "review")}`
                            : "★ New · no reviews yet"}
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2.5 max-sm:w-full max-sm:flex-row max-sm:items-center max-sm:justify-between">
                    {score > 0 && (
                        <span className="inline-flex h-6 items-center gap-1 rounded-full bg-forest px-2.5 text-[11px] font-medium text-mint">
                            <span aria-hidden>⟳</span> {score}% Skill Match
                        </span>
                    )}
                    <Link to={`/users/${user.id}`} className={featured ? "btn-light" : "btn-ghost-dark"}>
                        View Profile →
                    </Link>
                </div>
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:pl-[64px]">
                <SkillRow label="Teaches" skills={teaches} />
                <SkillRow label="Wants to learn" skills={wants} />
            </div>
        </article>
    )
}
