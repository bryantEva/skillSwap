import type { RequestHandler } from "express"
import { prisma } from "../prisma.js"

const DAILY_LOGIN_COINS = 10

// ─── Get Coin Transactions milik user ─────────────────────────────────────────
export const getCoinTransactions: RequestHandler<{ userId: string }> = async (req, res) => {
    const userId = parseInt(req.params.userId)

    try {
        const transactions = await prisma.coinTransaction.findMany({
            where: { userId },
            include: {
                session: { select: { id: true, type: true, skill: { select: { name: true } } } }
            },
            orderBy: { createdAt: "desc" }
        })

        res.status(200).json({ data: transactions })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Gagal mengambil riwayat transaksi koin." })
    }
}

// ─── Daily Login Reward ────────────────────────────────────────────────────────
export const dailyLogin: RequestHandler<{ userId: string }> = async (req, res) => {
    const userId = parseInt(req.params.userId)

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId }
        })

        if (!user) {
            res.status(404).json({ error: "User tidak ditemukan." })
            return
        }

        // Cek apakah sudah claim hari ini
        const startOfToday = new Date()
        startOfToday.setHours(0, 0, 0, 0)

        const alreadyClaimed = await prisma.coinTransaction.findFirst({
            where: {
                userId,
                type: "DAILY_LOGIN",
                createdAt: { gte: startOfToday }
            }
        })

        if (alreadyClaimed) {
            res.status(400).json({
                error: "Kamu sudah mengklaim reward harian hari ini. Kembali lagi besok!",
                nextClaimAt: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000)
            })
            return
        }

        // Berikan koin & catat transaksi
        const [updatedUser, transaction] = await prisma.$transaction([
            prisma.user.update({
                where: { id: userId },
                data: { coins: { increment: DAILY_LOGIN_COINS } }
            }),
            prisma.coinTransaction.create({
                data: {
                    userId,
                    amount: DAILY_LOGIN_COINS,
                    type: "DAILY_LOGIN",
                    description: `Reward login harian: +${DAILY_LOGIN_COINS} koin`
                }
            })
        ])

        res.status(200).json({
            message: `Selamat! Kamu mendapat ${DAILY_LOGIN_COINS} koin dari login harian.`,
            coins: updatedUser.coins,
            transaction
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Gagal mengklaim reward harian." })
    }
}
