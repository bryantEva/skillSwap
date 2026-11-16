import type { RequestHandler } from "express"
import { prisma } from "../prisma.js"

// Harga plan dalam koin
const PLAN_PRICES: Record<string, number> = {
    BASIC: 50,
    PRO: 150,
    PREMIUM: 300
}

// Durasi plan dalam hari
const PLAN_DURATION_DAYS: Record<string, number> = {
    BASIC: 30,
    PRO: 30,
    PREMIUM: 30
}

// ─── Beli / Tambah Subscription ───────────────────────────────────────────────
export const addSubscription: RequestHandler<{ userId: string }> = async (req, res) => {
    const userId = parseInt(req.params.userId)
    const { planName } = req.body

    const plan = planName?.toUpperCase()

    if (!PLAN_PRICES[plan]) {
        res.status(400).json({
            error: `Plan tidak dikenali. Pilih: ${Object.keys(PLAN_PRICES).join(", ")}`
        })
        return
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } })

        if (!user) {
            res.status(404).json({ error: "User tidak ditemukan." })
            return
        }

        const price = PLAN_PRICES[plan]

        if (user.coins < price) {
            res.status(400).json({
                error: `Saldo koin tidak mencukupi. Dibutuhkan: ${price} koin, Saldo: ${user.coins} koin.`
            })
            return
        }

        const startDate = new Date()
        const endDate = new Date()
        endDate.setDate(endDate.getDate() + PLAN_DURATION_DAYS[plan])

        const [subscription] = await prisma.$transaction([
            prisma.subscription.create({
                data: {
                    userId,
                    planName: plan,
                    status: "ACTIVE",
                    startDate,
                    endDate
                }
            }),
            prisma.user.update({
                where: { id: userId },
                data: { coins: { decrement: price } }
            }),
            prisma.coinTransaction.create({
                data: {
                    userId,
                    amount: -price,
                    type: "SUBSCRIPTION_PAYMENT",
                    description: `Pembayaran subscription plan ${plan}`
                }
            })
        ])

        res.status(201).json({
            message: `Subscription plan ${plan} berhasil diaktifkan.`,
            data: subscription
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Gagal membeli subscription." })
    }
}

// ─── Get Subscription aktif milik user ────────────────────────────────────────
export const getSubscription: RequestHandler<{ userId: string }> = async (req, res) => {
    const userId = parseInt(req.params.userId)

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } })

        if (!user) {
            res.status(404).json({ error: "User tidak ditemukan." })
            return
        }

        const subscriptions = await prisma.subscription.findMany({
            where: { userId },
            orderBy: { startDate: "desc" }
        })

        // Cek & update status expired
        const now = new Date()
        const updatedSubs = await Promise.all(
            subscriptions.map(async (sub: typeof subscriptions[number]) => {
                if (sub.status === "ACTIVE" && sub.endDate < now) {
                    return prisma.subscription.update({
                        where: { id: sub.id },
                        data: { status: "EXPIRED" }
                    })
                }
                return sub
            })
        )

        const activeSub = updatedSubs.find((s: { status: string }) => s.status === "ACTIVE") ?? null

        res.status(200).json({
            active: activeSub,
            history: updatedSubs
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Gagal mengambil data subscription." })
    }
}
