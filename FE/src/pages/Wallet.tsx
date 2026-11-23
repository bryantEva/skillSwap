import { useMemo, useState } from "react"
import { CoinDot } from "../components/Coin"
import { ErrorBlock, LoadingBlock, Notice, Spinner } from "../components/Feedback"
import { CenterLayout } from "../components/SplitLayout"
import { useAuth, useCurrentUser } from "../context/AuthContext"
import { useAsync } from "../hooks/useAsync"
import { api } from "../lib/api"
import { cn } from "../lib/cn"
import { formatDate, formatShortDateTime } from "../lib/format"
import { tintBg, type Tint } from "../lib/tints"
import type { TransactionType } from "../types"
import { Link } from "react-router-dom"

// Harus sama dengan PLAN_PRICES di BE/src/handler/subscription.ts
const PLANS: Array<{ id: string; name: string; price: number; tint: Tint; perks: string[] }> = [
    { id: "BASIC", name: "Basic", price: 50, tint: "navy", perks: ["BASIC badge on your profile", "Active for 30 days"] },
    { id: "PRO", name: "Pro", price: 150, tint: "forest", perks: ["PRO badge on your profile", "Active for 30 days"] },
    { id: "PREMIUM", name: "Premium", price: 300, tint: "plum", perks: ["PREMIUM badge on your profile", "Active for 30 days"] }
]

const txLabel: Record<TransactionType, string> = {
    DAILY_LOGIN: "Daily reward",
    ESCROW_HOLD: "Held in escrow",
    TEACHER_PAYOUT: "Session payout",
    REFUND: "Refund",
    SUBSCRIPTION_PAYMENT: "Subscription",
    WITHDRAWAL: "Withdrawal",
    COIN_PURCHASE: "Coin purchase"
}

export default function Wallet() {
    const me = useCurrentUser()
    const { patchUser, refreshUser } = useAuth()

    const data = useAsync(
        () => Promise.all([api.getUser(me.id), api.getCoinTransactions(me.id), api.getSubscription(me.id)]),
        [me.id]
    )
    const profile = data.data?.[0]
    const txs = data.data?.[1] ?? []
    const sub = data.data?.[2]

    const [busy, setBusy] = useState<string | null>(null)
    const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null)

    const claimedToday = useMemo(() => {
        const start = new Date()
        start.setHours(0, 0, 0, 0)
        return txs.some((t) => t.type === "DAILY_LOGIN" && new Date(t.createdAt) >= start)
    }, [txs])

    const run = async (key: string, fn: () => Promise<{ message: string }>) => {
        setBusy(key)
        setMsg(null)
        try {
            const res = await fn()
            setMsg({ tone: "success", text: res.message })
            data.reload()
            await refreshUser()
        } catch (err) {
            setMsg({ tone: "error", text: (err as Error).message })
        } finally {
            setBusy(null)
        }
    }

    const coins = profile?.coins ?? me.coins ?? 0

    return (
        <CenterLayout width={720}>
            <h1 className="title-xl">Your Coins</h1>
            <p className="mt-3 text-[17px] leading-6.25 text-muted">Earn coins by teaching, spend them to learn.</p>

            {data.error ? (
                <div className="mt-6">
                    <ErrorBlock error={data.error} onRetry={data.reload} />
                </div>
            ) : data.loading && !data.data ? (
                <LoadingBlock />
            ) : (
                <>
                    {/* Saldo */}
                    <div className="card-dark mt-6 flex flex-wrap items-center gap-5 p-6">
                        <span className="grid size-14 place-items-center rounded-full bg-olive">
                            <CoinDot size={26} />
                        </span>
                        <div className="flex-1">
                            <p className="text-[14px] text-dim">Available balance</p>
                            <p className="font-display text-[34px] leading-tight font-bold tracking-[-0.02em]">
                                {(me.coins ?? 0).toLocaleString("en-US")} coins
                            </p>
                            {!!profile?.escrowCoins && (
                                <p className="text-[13px] text-dim">{profile.escrowCoins} coins held in escrow for booked sessions</p>
                            )}
                        </div>
                        <button
                            type="button"
                            disabled={claimedToday || busy !== null}
                            onClick={() =>
                                run("daily", async () => {
                                    const r = await api.claimDaily(me.id)
                                    patchUser({ coins: r.coins })
                                    return r
                                })
                            }
                            className="btn-light h-11 px-5"
                        >
                            {busy === "daily" ? <Spinner className="size-4" /> : claimedToday ? "Claimed today ✓" : "Claim +10 daily"}
                        </button>
                        <Link to="/coins/buy" className="btn-ghost-dark h-11 px-5">
                            Buy coins
                        </Link>
                    </div>

                    {msg && (
                        <Notice tone={msg.tone} className="mt-4">
                            {msg.text}
                        </Notice>
                    )}

                    {/* Subscription */}
                    <h2 className="title-section mt-8 mb-1">Membership</h2>
                    <p className="mb-3 text-[14px] text-muted">
                        {sub?.active
                            ? `${sub.active.planName} is active until ${formatDate(sub.active.endDate)}.`
                            : "Pay with coins. Plans last 30 days."}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-3">
                        {PLANS.map((p) => {
                            const active = sub?.active?.planName === p.id
                            const tooPoor = coins < p.price
                            return (
                                <div key={p.id} className={cn("flex flex-col rounded-2xl p-4 text-pampas", tintBg[p.tint])}>
                                    <p className="font-display text-[18px] font-semibold">{p.name}</p>
                                    <p className="mt-1 flex items-center gap-1.5 text-[14px]">
                                        <CoinDot size={14} /> {p.price} coins
                                    </p>
                                    <ul className="mt-3 mb-4 flex flex-col gap-1 text-[13px] text-pampas/80">
                                        {p.perks.map((perk) => (
                                            <li key={perk}>· {perk}</li>
                                        ))}
                                    </ul>
                                    <button
                                        type="button"
                                        disabled={active || tooPoor || busy !== null}
                                        onClick={() => {
                                            if (window.confirm(`Beli plan ${p.name} seharga ${p.price} koin?`))
                                                run(p.id, () => api.buySubscription(me.id, p.id))
                                        }}
                                        className="btn-light mt-auto h-10"
                                        title={tooPoor ? `Butuh ${p.price - coins} koin lagi` : undefined}
                                    >
                                        {busy === p.id ? <Spinner className="size-4" /> : active ? "Active" : tooPoor ? "Not enough coins" : "Choose plan"}
                                    </button>
                                </div>
                            )
                        })}
                    </div>

                    {/* Riwayat */}
                    <h2 className="title-section mt-8 mb-3">History</h2>

                    {txs.length === 0 ? (
                        <p className="text-[15px] text-muted">No transactions yet. Claim your daily coins to get started.</p>
                    ) : (
                        <ul className="card-dark divide-y divide-card-2 overflow-hidden">
                            {txs.map((t) => (
                                <li key={t.id} className="flex items-center gap-4 px-5 py-3.5">
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[15px] font-medium">{txLabel[t.type]}</p>
                                        <p className="truncate text-[13px] text-dim">
                                            {t.session ? `${t.session.skill.name} · ` : ""}
                                            {formatShortDateTime(t.createdAt)}
                                        </p>
                                    </div>
                                    <p
                                        className={cn(
                                            "font-display text-[16px] font-semibold tabular-nums",
                                            t.amount >= 0 ? "text-mint" : "text-[#f0b4a8]"
                                        )}
                                    >
                                        {t.amount >= 0 ? "+" : "−"}
                                        {Math.abs(t.amount)}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </CenterLayout>
    )
}
