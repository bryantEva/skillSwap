import { useState, type FormEvent } from "react"
import { Link, useParams } from "react-router-dom"
import { art } from "../assets/illustrations"
import { Avatar } from "../components/Avatar"
import { BackLink } from "../components/BackLink"
import { Chip } from "../components/Chip"
import { ErrorBlock, LoadingBlock, Notice, Spinner } from "../components/Feedback"
import { SplitLayout } from "../components/SplitLayout"
import { Stepper } from "../components/Stepper"
import { useAuth, useCurrentUser } from "../context/AuthContext"
import { useAsync } from "../hooks/useAsync"
import { api } from "../lib/api"
import { displayName, formatDate, levelLabel, plural } from "../lib/format"
import { headline } from "../lib/matching"
import { tintFor } from "../lib/tints"
import type { UserProfile, UserSkill } from "../types"

function listText(names: string[]) {
    if (names.length <= 1) return names.join("")
    return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`
}

function aboutText(p: UserProfile, teach: UserSkill[], want: UserSkill[]) {
    const since = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(p.createdAt))
    const parts = [`On SkillSwap since ${since}.`]
    if (teach.length) parts.push(`Happy to help others with ${listText(teach.map((s) => s.skill.name))}.`)
    if (want.length) parts.push(`Currently learning ${listText(want.map((s) => s.skill.name))}.`)
    return parts.join(" ")
}

export default function Profile() {
    const me = useCurrentUser()
    const params = useParams()
    const userId = params.userId ? Number(params.userId) : me.id
    const isMe = userId === me.id

    const data = useAsync(
        () => Promise.all([api.getUser(userId), api.getUserRatings(userId), api.getSessions(userId)]),
        [userId]
    )
    const [editing, setEditing] = useState(false)

    if (Number.isNaN(userId)) {
        return (
            <SplitLayout art={art.profile}>
                <Notice tone="error">Profil tidak ditemukan.</Notice>
            </SplitLayout>
        )
    }

    const profile = data.data?.[0]
    const ratings = data.data?.[1]
    const sessions = data.data?.[2] ?? []

    const teach = profile?.userSkills.filter((s) => s.type === "OFFERING") ?? []
    const want = profile?.userSkills.filter((s) => s.type === "LEARNING") ?? []
    const completed = sessions.filter((s) => s.status === "COMPLETED").length
    const availableSwap = want.length > 0 && teach.length > 0
    const availablePaid = teach.some((s) => s.offeredCoins > 0)

    return (
        <SplitLayout art={art.profile} artAlt="Illustration of a learner reading in an armchair" artWidth={580}>
            <BackLink fallback="/browse" />
            <div className="mt-5">
                <Stepper active={4} profileTo={isMe ? "/profile" : `/users/${userId}`} />
            </div>

            {data.error ? (
                <div className="mt-8">
                    <ErrorBlock error={data.error} onRetry={data.reload} />
                </div>
            ) : data.loading || !profile ? (
                <LoadingBlock />
            ) : (
                <>
                    {/* Header profil */}
                    <div className="mt-8 flex items-start gap-5">
                        <Avatar src={profile.avatarUrl} name={profile.name} size={104} className="max-sm:!size-20" />
                        <div className="min-w-0 pt-1">
                            <h1 className="font-display text-[32px] leading-[1.1] font-bold tracking-[-0.03em] sm:text-[36px]">
                                {displayName(profile.name)}
                            </h1>
                            <p className="mt-1 text-[15px] text-muted">{headline(profile.userSkills)}</p>
                            <p className="text-[15px] text-muted">
                                ★ {ratings && ratings.totalRatings > 0 ? ratings.averageStars.toFixed(1) : "New"} ·{" "}
                                {plural(ratings?.totalRatings ?? 0, "Review")} · {plural(completed, "Session")}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {profile.isVerified && (
                                    <span className="inline-flex h-6 items-center rounded-full bg-forest px-2.5 text-[12px] font-medium text-mint">
                                        ✓ Verified
                                    </span>
                                )}
                                {profile.subscriptions[0] && (
                                    <span className="inline-flex h-6 items-center rounded-full bg-olive px-2.5 text-[12px] font-medium text-pampas">
                                        {profile.subscriptions[0].planName} member
                                    </span>
                                )}
                                {isMe && !editing && (
                                    <button
                                        type="button"
                                        onClick={() => setEditing(true)}
                                        className="inline-flex h-6 cursor-pointer items-center rounded-full border border-ink px-2.5 text-[12px] font-medium hover:bg-pampas"
                                    >
                                        Edit profile
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {isMe && editing && (
                        <EditProfileForm
                            profile={profile}
                            onDone={(updated) => {
                                setEditing(false)
                                if (updated) data.setData((prev) => (prev ? [{ ...prev[0], ...updated }, prev[1], prev[2]] : prev!))
                            }}
                        />
                    )}

                    <h2 className="title-section mt-7">About</h2>
                    <p className="mt-2 max-w-[440px] text-[17px] leading-[24px] text-muted">{aboutText(profile, teach, want)}</p>
                    <hr className="mt-4 max-w-[424px] border-[#868683]" />

                    <h2 className="title-section mt-6 mb-3">Skills I Teach</h2>
                    {teach.length ? (
                        <div className="flex flex-wrap gap-2.5">
                            {teach.map((s) => (
                                <Chip
                                    key={s.id}
                                    tint={tintFor(s.skill.name)}
                                    title={`${levelLabel[s.proficiencyLevel]}${s.offeredCoins ? ` · ${s.offeredCoins} coins/session` : ""}`}
                                >
                                    {s.skill.name}
                                </Chip>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[15px] text-muted">No skills to teach yet.</p>
                    )}

                    <h2 className="title-section mt-6 mb-3">Skills I Want</h2>
                    {want.length ? (
                        <div className="flex flex-wrap gap-2.5">
                            {want.map((s) => (
                                <Chip key={s.id} tint={tintFor(s.skill.name)}>
                                    {s.skill.name}
                                </Chip>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[15px] text-muted">Not looking for anything right now.</p>
                    )}

                    {(availableSwap || availablePaid) && (
                        <>
                            <h2 className="title-section mt-6 mb-3">Available for</h2>
                            <div className="flex flex-wrap gap-2.5">
                                {availableSwap && (
                                    <Chip tint="plum" icon="⇄">
                                        Skill Swap
                                    </Chip>
                                )}
                                {availablePaid && (
                                    <Chip tint="navy" icon="▭">
                                        Paid Sessions
                                    </Chip>
                                )}
                            </div>
                        </>
                    )}

                    {ratings && ratings.data.length > 0 && (
                        <>
                            <h2 className="title-section mt-6 mb-3">Recent reviews</h2>
                            <ul className="flex max-w-[424px] flex-col gap-3">
                                {ratings.data.slice(0, 3).map((r) => (
                                    <li key={r.id} className="flex gap-3">
                                        <Avatar src={r.reviewer.avatarUrl} name={r.reviewer.name} size={32} />
                                        <div className="min-w-0 text-[14px] leading-5">
                                            <p>
                                                <span className="font-medium">{displayName(r.reviewer.name)}</span>{" "}
                                                <span className="text-star" aria-label={`${r.stars} stars`}>
                                                    {"★".repeat(r.stars)}
                                                </span>
                                            </p>
                                            <p className="text-muted">
                                                {r.comment || "No comment"} · {r.session.skill.name} · {formatDate(r.createdAt)}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}

                    <div className="mt-7 max-w-[424px]">
                        {isMe ? (
                            <Link to="/setup" className="btn-primary">
                                Edit my skills →
                            </Link>
                        ) : teach.length > 0 ? (
                            <Link to={`/swap/new?with=${profile.id}`} className="btn-primary">
                                Request a Skill Swap →
                            </Link>
                        ) : (
                            <p className="text-[15px] text-muted">This member isn't offering any skills yet.</p>
                        )}
                    </div>
                </>
            )}
        </SplitLayout>
    )
}

function EditProfileForm({
    profile,
    onDone
}: {
    profile: UserProfile
    onDone: (updated?: Partial<UserProfile>) => void
}) {
    const { patchUser } = useAuth()
    const [name, setName] = useState(profile.name ?? "")
    const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const submit = async (e: FormEvent) => {
        e.preventDefault()
        setBusy(true)
        setError(null)
        try {
            const res = await api.updateUser(profile.id, {
                name: name.trim() || undefined,
                avatarUrl: avatarUrl.trim() || undefined
            })
            patchUser({ name: res.data.name, avatarUrl: res.data.avatarUrl })
            onDone({ name: res.data.name, avatarUrl: res.data.avatarUrl })
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setBusy(false)
        }
    }

    return (
        <form onSubmit={submit} className="card-dark mt-5 flex max-w-[480px] flex-col gap-3 p-5">
            <label className="block">
                <span className="mb-1.5 block text-[13px] text-dim">Name</span>
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 w-full rounded-full border border-card-2 bg-ink px-4 text-[15px] text-pampas outline-none focus:border-dim"
                />
            </label>
            <label className="block">
                <span className="mb-1.5 block text-[13px] text-dim">Avatar URL</span>
                <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://…"
                    className="h-11 w-full rounded-full border border-card-2 bg-ink px-4 text-[15px] text-pampas outline-none placeholder:text-[#8b897f] focus:border-dim"
                />
            </label>
            <p className="text-[12px] text-dim">Email: {profile.email}</p>
            {error && <Notice tone="error">{error}</Notice>}
            <div className="flex gap-2">
                <button type="submit" disabled={busy} className="btn-light h-10 px-5">
                    {busy ? <Spinner className="size-4" /> : "Save"}
                </button>
                <button type="button" onClick={() => onDone()} className="btn-ghost-dark h-10 px-5">
                    Cancel
                </button>
            </div>
        </form>
    )
}
