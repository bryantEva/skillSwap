import type { RequestHandler } from "express"
import { prisma } from "../prisma.js"

export const getAllUsers: RequestHandler = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                avatarUrl: true,
                isVerified: true,
                userSkills: {
                    include: { skill: { select: { id: true, name: true } } }
                },
                receivedRatings: { select: { stars: true } },
                sessionsAsTeacher: {
                    where: { status: "COMPLETED" },
                    select: { id: true }
                }
            }
        })

        const data = users.map((u) => {
            const { receivedRatings, sessionsAsTeacher, ...rest } = u
            const totalRatings = receivedRatings.length
            const averageStars =
                totalRatings > 0
                    ? receivedRatings.reduce((sum, r) => sum + r.stars, 0) / totalRatings
                    : 0

            return {
                ...rest,
                averageStars,
                totalRatings,
                completedSessions: sessionsAsTeacher.length
            }
        })

        res.status(200).json({ message: "Daftar user berhasil diambil.", data })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Gagal mengambil daftar user." })
    }
}

const normalizeWhatsapp = (input: string): string | null => {
    let n = input.replace(/[\s\-+()]/g, "")
    if (n.startsWith("0")) n = "62" + n.slice(1)
    return /^62\d{8,13}$/.test(n) ? n : null
}

const normalizeInstagram = (input: string): string | null => {
    const u = input
        .trim()
        .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
        .replace(/^@/, "")
        .replace(/[/?].*$/, "")
    return /^[a-zA-Z0-9._]{1,30}$/.test(u) ? u : null
}

export const updateUserProfile: RequestHandler<{ userId: string }> = async (req, res) => {
    const userId = parseInt(req.params.userId)
    const data = req.body

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

        // undefined = tidak diubah, ""/null = dihapus, string = divalidasi
        let whatsappNumber: string | null | undefined = undefined
        if (data.whatsappNumber !== undefined) {
            if (data.whatsappNumber === null || data.whatsappNumber === "") {
                whatsappNumber = null
            } else {
                const n = normalizeWhatsapp(String(data.whatsappNumber))
                if (!n) {
                    res.status(400).json({ error: "Format nomor WhatsApp tidak valid. Contoh: 081234567890." })
                    return
                }
                whatsappNumber = n
            }
        }

        let instagramUsername: string | null | undefined = undefined
        if (data.instagramUsername !== undefined) {
            if (data.instagramUsername === null || data.instagramUsername === "") {
                instagramUsername = null
            } else {
                const u = normalizeInstagram(String(data.instagramUsername))
                if (!u) {
                    res.status(400).json({ error: "Username Instagram tidak valid." })
                    return
                }
                instagramUsername = u
            }
        }

        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                name: data.name ?? user.name,
                avatarUrl: data.avatarUrl ?? user.avatarUrl,
                whatsappNumber,
                instagramUsername
            },
            select: {
                id: true, email: true, name: true, avatarUrl: true,
                whatsappNumber: true, instagramUsername: true,
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
    const viewerId = req.user?.userId

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true, email: true, name: true, avatarUrl: true,
                whatsappNumber: true, instagramUsername: true,
                coins: true, escrowCoins: true, isVerified: true, createdAt: true,
                userSkills: {
                    include: { skill: { select: { id: true, name: true } } }
                },
                subscriptions: { where: { status: "ACTIVE" } }
            }
        })

        if (!user) {
            res.status(404).json({ error: "User tidak ditemukan." })
            return
        }

        const isOwner = viewerId === userId

        let hasActiveSession = false
        if (viewerId && !isOwner) {
            hasActiveSession =
                (await prisma.session.count({
                    where: {
                        status: { in: ["PENDING", "ONGOING"] },
                        OR: [
                            { teacherId: userId, studentId: viewerId },
                            { teacherId: viewerId, studentId: userId }
                        ]
                    }
                })) > 0
        }

        const { whatsappNumber, email, coins, escrowCoins, subscriptions, ...publicData } = user

        const data = isOwner
            ? user
            : {
                ...publicData,
                ...(hasActiveSession ? { whatsappNumber } : {})
            }

        res.status(200).json({ message: "User berhasil ditemukan.", data })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Terjadi kesalahan server." })
    }
}
