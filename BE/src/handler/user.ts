import type { RequestHandler } from "express"
import { prisma } from "../prisma.js"

export const updateUserProfile: RequestHandler<{ userId: string }> = async (req, res) => {
    const userId = parseInt(req.params.userId)
    const data = req.body

    // Authorization: hanya pemilik akun yang boleh update profil
    if (req.user?.userId !== userId) {
        res.status(403).json({ error: "Kamu tidak diizinkan mengubah profil user lain." })
        return
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } })
        if (!user) {
            res.status(404).json({ error: "User tidak ditemukan." })
            return
        }

        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                name: data.name ?? user.name,
                avatarUrl: data.avatarUrl ?? user.avatarUrl
            },
            select: {
                id: true, email: true, name: true, avatarUrl: true,
                coins: true, isVerified: true, updatedAt: true
            }
        })

        res.status(200).json({ message: "Profil berhasil diupdate.", data: updated })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Gagal memperbaharui profil user." })
    }
}

export const getUserProfle: RequestHandler<{ userId: string }> = async (req, res) => {
    const userId = parseInt(req.params.userId)

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true, email: true, name: true, avatarUrl: true,
                coins: true, escrowCoins: true, isVerified: true, createdAt: true,
                userSkills: {
                    include: { skill: { select: { id: true, name: true } } }
                },
                subscriptions: { where: { status: "ACTIVE" } }
            }
        })

        if (!user) {
            // BUG FIX: sebelumnya return 500, seharusnya 404
            res.status(404).json({ error: "User tidak ditemukan." })
            return
        }

        res.status(200).json({ message: "User berhasil ditemukan.", data: user })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Terjadi kesalahan server." })
    }
}
