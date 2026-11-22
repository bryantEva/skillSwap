import type { RequestHandler } from "express"
import { randomBytes } from "crypto"
import { prisma } from "../prisma.js"

const ORDER_TTL_MS = 60 * 60 * 1000 // 1 jam

// Idempotent: aman dipanggil berkali-kali (webhook gateway sering mengirim ulang)
export async function fulfillOrder(orderCode: string): Promise<boolean> {
    return prisma.$transaction(async (tx) => {
        // Hanya satu pemanggil yang berhasil mengubah PENDING -> PAID
        const claimed = await tx.coinOrder.updateMany({
            where: { orderCode, status: "PENDING", expiresAt: { gt: new Date() } },
            data: { status: "PAID", paidAt: new Date() }
        })
        if (claimed.count === 0) return false

        const order = await tx.coinOrder.findUniqueOrThrow({ where: { orderCode } })

        await tx.user.update({
            where: { id: order.userId },
            data: { coins: { increment: order.coins } }
        })
        await tx.coinTransaction.create({
            data: {
                userId: order.userId,
                amount: order.coins,
                type: "COIN_PURCHASE",
                description: `Beli ${order.coins} koin (order ${order.orderCode})`
            }
        })
        return true
    })
}

export const getCoinPackages: RequestHandler = async (_req, res) => {
    try {
        const data = await prisma.coinPackage.findMany({
            where: { isActive: true },
            orderBy: { price: "asc" }
        })
        res.status(200).json({ data })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Gagal mengambil paket koin." })
    }
}

export const createCoinOrder: RequestHandler<{ userId: string }> = async (req, res) => {
    const userId = parseInt(req.params.userId)
    const packageId = parseInt(req.body.packageId)

    if (req.user?.userId !== userId) {
        res.status(403).json({ error: "Tidak diizinkan." })
        return
    }
    if (!Number.isInteger(packageId)) {
        res.status(400).json({ error: "packageId wajib diisi." })
        return
    }

    try {
        const pkg = await prisma.coinPackage.findFirst({ where: { id: packageId, isActive: true } })
        if (!pkg) {
            res.status(404).json({ error: "Paket tidak ditemukan." })
            return
        }

        const order = await prisma.coinOrder.create({
            data: {
                orderCode: `ORD-${Date.now()}-${randomBytes(3).toString("hex").toUpperCase()}`,
                userId,
                packageId: pkg.id,
                coins: pkg.coins,   // harga & jumlah koin diambil dari database,
                amount: pkg.price,  // bukan dari request
                expiresAt: new Date(Date.now() + ORDER_TTL_MS)
            }
        })

        res.status(201).json({ message: "Order dibuat. Selesaikan pembayaran.", data: order })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Gagal membuat order." })
    }
}

export const getUserCoinOrders: RequestHandler<{ userId: string }> = async (req, res) => {
    const userId = parseInt(req.params.userId)
    if (req.user?.userId !== userId) {
        res.status(403).json({ error: "Tidak diizinkan." })
        return
    }
    try {
        const data = await prisma.coinOrder.findMany({
            where: { userId },
            include: { package: { select: { name: true } } },
            orderBy: { createdAt: "desc" }
        })
        res.status(200).json({ data })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Gagal mengambil riwayat order." })
    }
}

// HANYA untuk development: pura-pura pembayaran berhasil
export const simulatePayment: RequestHandler<{ orderCode: string }> = async (req, res) => {
    if (process.env.NODE_ENV === "production") {
        res.status(404).json({ error: "Not found." })
        return
    }
    try {
        const order = await prisma.coinOrder.findUnique({ where: { orderCode: req.params.orderCode } })
        if (!order || order.userId !== req.user?.userId) {
            res.status(404).json({ error: "Order tidak ditemukan." })
            return
        }
        const ok = await fulfillOrder(order.orderCode)
        if (!ok) {
            res.status(400).json({ error: "Order sudah diproses atau kedaluwarsa." })
            return
        }
        res.status(200).json({ message: "Pembayaran berhasil. Koin ditambahkan." })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Gagal memproses pembayaran." })
    }
}