import { useState } from "react"
import { CenterLayout } from "../components/SplitLayout"
import { EmptyCard, ErrorBlock, LoadingBlock, Notice, Spinner } from "../components/Feedback"
import { useAuth, useCurrentUser } from "../context/AuthContext"
import { useAsync } from "../hooks/useAsync"
import { api } from "../lib/api"

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`

export default function BuyCoins() {
    const me = useCurrentUser()
    const { refreshUser } = useAuth()
    const packages = useAsync(() => api.getCoinPackages(), [])
    const [busyId, setBusyId] = useState<number | null>(null)
    const [flash, setFlash] = useState<{ tone: "success" | "error"; text: string } | null>(null)

    const buy = async (packageId: number) => {
        setBusyId(packageId)
        setFlash(null)
        try {
            const order = await api.createCoinOrder(me.id, packageId)
            // Nanti, saat pakai gateway asli: redirect ke halaman pembayaran di sini,
            // bukan simulatePay.
            const res = await api.simulatePay(order.data.orderCode)
            setFlash({ tone: "success", text: res.message })
            await refreshUser()
        } catch (err) {
            setFlash({ tone: "error", text: (err as Error).message })
        } finally {
            setBusyId(null)
        }
    }

    return (
        <CenterLayout width={720}>
            <h1 className="title-xl">Buy Coins</h1>
            <p className="mt-3 text-[17px] leading-6.25 text-muted">
                Saldo kamu: <b>{me.coins}</b> koin
            </p>

            {flash && <Notice tone={flash.tone} className="mt-4">{flash.text}</Notice>}

            <div className="mt-5 flex flex-col gap-2.5">
                {packages.error ? (
                    <ErrorBlock error={packages.error} onRetry={packages.reload} />
                ) : packages.loading ? (
                    <LoadingBlock />
                ) : !packages.data?.length ? (
                    <EmptyCard title="Belum ada paket" text="Paket koin belum tersedia." />
                ) : (
                    packages.data.map((p) => (
                        <article key={p.id} className="card-dark flex items-center gap-4 p-4.25">
                            <div className="min-w-0 flex-1">
                                <p className="font-display text-[16px] font-semibold">{p.name}</p>
                                <p className="text-[14px] text-dim">{p.coins} koin</p>
                            </div>
                            <button
                                type="button"
                                disabled={busyId !== null}
                                onClick={() => buy(p.id)}
                                className="btn-light"
                            >
                                {busyId === p.id ? <Spinner className="size-4" /> : rupiah(p.price)}
                            </button>
                        </article>
                    ))
                )}
            </div>
        </CenterLayout>
    )
}