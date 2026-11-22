import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { art } from "../assets/illustrations"
import { Avatar } from "../components/Avatar"
import { BackLink } from "../components/BackLink"
import { CoinDot } from "../components/Coin"
import { ErrorBlock, LoadingBlock, Notice, Spinner } from "../components/Feedback"
import { SplitLayout } from "../components/SplitLayout"
import { useAuth, useCurrentUser } from "../context/AuthContext"
import { useAsync } from "../hooks/useAsync"
import { api } from "../lib/api"
import { cn } from "../lib/cn"
import { defaultSchedule, displayName, firstName, levelLabel, toLocalInput } from "../lib/format"
import type { UserSkill } from "../types"

type Mode = "swap" | "coins"

export default function CreateSwap() {
    const me = useCurrentUser()
    const { refreshUser } = useAuth()
    const navigate = useNavigate()
    const [params] = useSearchParams()
    const withId = Number(params.get("with"))

    const data = useAsync(
        () => (withId ? Promise.all([api.getUser(withId), api.getUserSkills(me.id)]) : Promise.reject(new Error("Pilih dulu orang yang ingin kamu ajak swap dari halaman Browse."))),
        [withId, me.id]
    )
    const other = data.data?.[0]
    const mySkills = data.data?.[1] ?? []

    const theirTeach = useMemo(() => other?.userSkills.filter((s) => s.type === "OFFERING") ?? [], [other])
    const theirWant = useMemo(() => other?.userSkills.filter((s) => s.type === "LEARNING") ?? [], [other])
    const myTeach = useMemo(() => mySkills.filter((s) => s.type === "OFFERING"), [mySkills])
    const myWant = useMemo(() => mySkills.filter((s) => s.type === "LEARNING"), [mySkills])

    const [mode, setMode] = useState<Mode>("swap")
    const [wantId, setWantId] = useState<number | null>(null) // userSkill id milik dia
    const [offerId, setOfferId] = useState<number | null>(null) // userSkill id milik aku
    const [coinInput, setCoinInput] = useState("")
    const [scheduledAt, setScheduledAt] = useState(defaultSchedule)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Pilihan awal: skill yang paling cocok
    useEffect(() => {
        if (!other) return
        const wantSkillIds = new Set(myWant.map((s) => s.skill.id))
        const theirWantIds = new Set(theirWant.map((s) => s.skill.id))
        const bestWant = theirTeach.find((s) => wantSkillIds.has(s.skill.id)) ?? theirTeach[0]
        const bestOffer = myTeach.find((s) => theirWantIds.has(s.skill.id)) ?? myTeach[0]
        setWantId(bestWant?.id ?? null)
        setOfferId(bestOffer?.id ?? null)
        if (myTeach.length === 0) setMode("coins")
    }, [other, myTeach, myWant, theirTeach, theirWant])

    const wantSkill = theirTeach.find((s) => s.id === wantId) ?? null
    const offerSkill = myTeach.find((s) => s.id === offerId) ?? null

    useEffect(() => {
        setCoinInput(wantSkill && wantSkill.offeredCoins > 0 ? String(wantSkill.offeredCoins) : "")
    }, [wantSkill])

    const price = wantSkill?.offeredCoins && wantSkill.offeredCoins > 0 ? wantSkill.offeredCoins : parseInt(coinInput) || 0
    const priceFixed = !!wantSkill && wantSkill.offeredCoins > 0
    const insufficient = mode === "coins" && price > me.coins

    const submit = async () => {
        setError(null)
        if (!other || !wantSkill) return setError("Pilih skill yang ingin kamu pelajari.")
        if (!scheduledAt) return setError("Pilih jadwal sesi.")
        const when = new Date(scheduledAt)
        if (Number.isNaN(when.getTime())) return setError("Format jadwal tidak valid.")
        if (when.getTime() < Date.now()) return setError("Jadwal harus di masa depan.")

        if (mode === "swap" && !offerSkill) return setError("Pilih skill yang kamu tawarkan.")
        if (mode === "coins" && price <= 0) return setError("Masukkan jumlah koin lebih dari 0.")
        if (insufficient) return setError(`Koin kamu tidak cukup (saldo ${me.coins}, butuh ${price}).`)

        setBusy(true)
        try {
            const res = await api.createSession(me.id, {
                type: mode === "swap" ? "TWO_WAY" : "ONE_WAY",
                teacherId: other.id,
                skillId: wantSkill.skill.id,
                exchangeSkillId: mode === "swap" ? offerSkill!.skill.id : undefined,
                coinAmount: mode === "coins" ? price : undefined,
                scheduledAt: when.toISOString()
            })
            if (mode === "coins") refreshUser().catch(() => { })
            navigate("/sessions", { state: { flash: res.message } })
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setBusy(false)
        }
    }

    return (
        <SplitLayout art={art.swap} artAlt="Illustration of a learner celebrating">
            <div className="flex items-center gap-3">
                <BackLink fallback="/browse" />
                <span className="inline-flex h-6.75 items-center gap-1.5 rounded-full bg-olive px-3 text-[12px] font-medium text-pampas">
                    <span aria-hidden>⇄</span> Swap Request
                </span>
            </div>

            <h1 className="title-xl mt-3">Create a Skill Swap</h1>
            <p className="mt-3 text-[17px] leading-6.25 text-muted">
                {mode === "swap" ? "Exchange skills, grow together." : "Book a session and pay with your coins."}
            </p>

            {data.error ? (
                <div className="mt-6">
                    <ErrorBlock error={data.error} />
                    <Link to="/browse" className="btn-primary mt-4">
                        Browse people →
                    </Link>
                </div>
            ) : data.loading || !other ? (
                <LoadingBlock />
            ) : theirTeach.length === 0 ? (
                <Notice className="mt-6">{displayName(other.name)} belum menawarkan skill apa pun.</Notice>
            ) : (
                <>
                    {/* Toggle mode */}
                    <div role="tablist" aria-label="Payment type" className="mt-3 inline-flex rounded-full border border-night bg-ink p-1">
                        {(
                            [
                                ["swap", "Swap skills"],
                                ["coins", "Pay with coins"]
                            ] as const
                        ).map(([id, label]) => (
                            <button
                                key={id}
                                type="button"
                                role="tab"
                                aria-selected={mode === id}
                                onClick={() => setMode(id)}
                                className={cn(
                                    "h-9 cursor-pointer rounded-full px-4 text-[14px] transition-colors",
                                    mode === id ? "bg-pampas text-ink" : "text-pampas hover:text-white"
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* You offer / You want */}
                    <div className="relative mt-5 grid gap-3 sm:grid-cols-2 sm:gap-9">
                        <div className="rounded-2xl bg-navy p-4">
                            <p className="mb-3 font-display text-[16px] font-semibold text-pampas">You offer</p>
                            {mode === "swap" ? (
                                myTeach.length ? (
                                    <SkillPicker
                                        skills={myTeach}
                                        value={offerId}
                                        onChange={setOfferId}
                                        glyph="</>"
                                        glyphClass="bg-forest"
                                        ariaLabel="Skill you offer"
                                    />
                                ) : (
                                    <div className="rounded-[14px] bg-card px-4 py-4 text-[14px] text-dim">
                                        You don't teach any skill yet.{" "}
                                        <Link to="/setup" className="text-pampas underline">
                                            Add one
                                        </Link>
                                    </div>
                                )
                            ) : (
                                <div className="flex min-h-18 items-center gap-3.5 rounded-[14px] bg-card px-3.5 py-3">
                                    <span className="grid size-11 place-items-center rounded-full bg-olive">
                                        <CoinDot size={20} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        {priceFixed ? (
                                            <p className="font-display text-[17px] font-semibold text-pampas">{price} coins</p>
                                        ) : (
                                            <label className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    inputMode="numeric"
                                                    value={coinInput}
                                                    onChange={(e) => setCoinInput(e.target.value)}
                                                    placeholder="0"
                                                    aria-label="Coins to pay"
                                                    className="w-20 rounded-lg border border-card-2 bg-ink px-2 py-1 font-display text-[17px] font-semibold text-pampas outline-none focus:border-dim"
                                                />
                                                <span className="font-display text-[17px] font-semibold text-pampas">coins</span>
                                            </label>
                                        )}
                                        <p className={cn("text-[14px]", insufficient ? "text-[#f0a597]" : "text-dim")}>
                                            Balance: {me.coins} coins
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <span
                            aria-hidden
                            className="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 text-[18px] text-muted/40 sm:block"
                        >
                            ⇄
                        </span>

                        <div className="rounded-2xl bg-plum p-4">
                            <p className="mb-3 font-display text-[16px] font-semibold text-pampas">You want</p>
                            <SkillPicker
                                skills={theirTeach}
                                value={wantId}
                                onChange={setWantId}
                                glyph="✎"
                                glyphClass="bg-plum"
                                ariaLabel="Skill you want to learn"
                                showPrice={mode === "coins"}
                            />
                        </div>
                    </div>

                    {/* Jadwal */}
                    <label className="mt-5 block">
                        <span className="label">When should the session happen?</span>
                        <input
                            type="datetime-local"
                            value={scheduledAt}
                            min={toLocalInput(new Date())}
                            onChange={(e) => setScheduledAt(e.target.value)}
                            className="input-dark scheme-dark"
                        />
                    </label>

                    {/* Summary */}
                    <div className="card-dark mt-5 p-4.25">
                        <p className="font-display text-[15px] font-semibold">Swap summary</p>
                        <div className="mt-3 flex flex-col gap-2.5 text-[15px]">
                            {mode === "swap" ? (
                                <p className="flex items-center gap-2.5">
                                    <Avatar src={me.avatarUrl} name={me.name} size={32} tone="sage" />
                                    <span>
                                        <b className="font-semibold">You</b> teach <b className="font-semibold">{offerSkill?.skill.name ?? "—"}</b>
                                    </span>
                                </p>
                            ) : (
                                <p className="flex items-center gap-2.5">
                                    <Avatar src={me.avatarUrl} name={me.name} size={32} tone="sage" />
                                    <span>
                                        <b className="font-semibold">You</b> pay <b className="font-semibold">{price || "—"} coins</b>
                                    </span>
                                </p>
                            )}
                            <p className="flex items-center gap-2.5">
                                <Avatar src={other.avatarUrl} name={other.name} size={32} />
                                <span>
                                    <b className="font-semibold">{firstName(other.name, "They")}</b> teaches{" "}
                                    <b className="font-semibold">{wantSkill?.skill.name ?? "—"}</b>
                                </span>
                            </p>
                        </div>
                        <p
                            className={cn(
                                "mt-4 rounded-lg px-3 py-2.5 text-[13px]",
                                insufficient ? "bg-maroon text-[#f3c9c0]" : "bg-forest text-mint"
                            )}
                        >
                            {mode === "swap"
                                ? "Fair exchange: 1 session given, 1 session received."
                                : insufficient
                                    ? `Not enough coins — you need ${price - me.coins} more.`
                                    : "Coins are held in escrow and only released when the session is completed."}
                        </p>
                    </div>

                    {error && (
                        <Notice tone="error" className="mt-4">
                            {error}
                        </Notice>
                    )}

                    <button
                        type="button"
                        onClick={submit}
                        disabled={busy || (mode === "swap" && !offerSkill) || insufficient}
                        className="btn-primary mt-4"
                    >
                        {busy ? <Spinner /> : mode === "swap" ? "Send Swap Request ➤" : "Book Session ➤"}
                    </button>
                </>
            )}
        </SplitLayout>
    )
}

/** Kartu skill gelap yang sebenarnya <select> — tampil seperti desain Figma */
function SkillPicker({
    skills,
    value,
    onChange,
    glyph,
    glyphClass,
    ariaLabel,
    showPrice
}: {
    skills: UserSkill[]
    value: number | null
    onChange: (id: number) => void
    glyph: string
    glyphClass: string
    ariaLabel: string
    showPrice?: boolean
}) {
    const current = skills.find((s) => s.id === value) ?? skills[0]
    const multiple = skills.length > 1
    return (
        <div className="relative flex min-h-[72px] items-center gap-3.5 rounded-[14px] bg-card px-3.5 py-3 focus-within:ring-2 focus-within:ring-pampas/60">
            <span className={cn("grid size-11 shrink-0 place-items-center rounded-full text-[14px] text-pampas", glyphClass)}>{glyph}</span>
            <div className="min-w-0 flex-1">
                <p className="truncate font-display text-[17px] font-semibold text-pampas">{current?.skill.name}</p>
                <p className="text-[14px] text-dim">
                    1 session · {current ? levelLabel[current.proficiencyLevel] : ""}
                    {showPrice && current && current.offeredCoins > 0 ? ` · ${current.offeredCoins} coins` : ""}
                </p>
            </div>
            {multiple && <span aria-hidden className="text-[12px] text-dim">▾</span>}
            {multiple && (
                <select
                    aria-label={ariaLabel}
                    value={current?.id}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="absolute inset-0 cursor-pointer opacity-0"
                >
                    {skills.map((s) => (
                        <option key={s.id} value={s.id}>
                            {s.skill.name}
                            {s.offeredCoins > 0 ? ` (${s.offeredCoins} coins)` : ""}
                        </option>
                    ))}
                </select>
            )}
        </div>
    )
}
