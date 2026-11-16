import type { RequestHandler } from "express"
import { prisma } from "../prisma.js"

// ─── Tambah Rating (hanya bisa setelah sesi COMPLETED) ────────────────────────
export const addRating: RequestHandler<{ sessionId: string }> = async (req, res) => {
    const sessionId = parseInt(req.params.sessionId)
    const { stars, comment, revieweeId } = req.body

    // reviewerId diambil dari token JWT (bukan dari body)
    const reviewerId = req.user!.userId

    if (!stars || stars < 1 || stars > 5) {
        res.status(400).json({ error: "Stars wajib diisi antara 1 sampai 5." })
        return
    }

    if (!revieweeId) {
        res.status(400).json({ error: "revieweeId wajib diisi." })
        return
    }

    try {
        const session = await prisma.session.findUnique({
            where: { id: sessionId }
        })

        if (!session) {
            res.status(404).json({ error: "Sesi tidak ditemukan." })
            return
        }

        if (session.status !== "COMPLETED") {
            res.status(400).json({ error: "Rating hanya bisa diberikan untuk sesi yang sudah COMPLETED." })
            return
        }

        // Cek reviewer adalah bagian dari sesi ini
        const isParticipant =
            session.teacherId === reviewerId ||
            session.studentId === reviewerId

        if (!isParticipant) {
            res.status(403).json({ error: "Kamu bukan peserta dari sesi ini." })
            return
        }

        // Cek sudah pernah rating belum
        const existingRating = await prisma.rating.findFirst({
            where: {
                sessionId,
                reviewerId
            }
        })

        if (existingRating) {
            res.status(409).json({ error: "Kamu sudah memberikan rating untuk sesi ini." })
            return
        }

        const rating = await prisma.rating.create({
            data: {
                sessionId,
                reviewerId,
                revieweeId: parseInt(revieweeId),
                stars: parseInt(stars),
                comment: comment ?? null
            }
        })

        res.status(201).json({
            message: "Rating berhasil diberikan.",
            data: rating
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Gagal memberikan rating." })
    }
}

// ─── Get Ratings untuk seorang user ──────────────────────────────────────────
export const getUserRatings: RequestHandler<{ userId: string }> = async (req, res) => {
    const userId = parseInt(req.params.userId)

    try {
        const ratings = await prisma.rating.findMany({
            where: { revieweeId: userId },
            include: {
                reviewer: { select: { id: true, name: true, avatarUrl: true } },
                session: { select: { id: true, skill: { select: { name: true } } } }
            },
            orderBy: { createdAt: "desc" }
        })

        const avgStars =
            ratings.length > 0
                ? ratings.reduce((sum: number, r: { stars: number }) => sum + r.stars, 0) / ratings.length
                : 0

        res.status(200).json({
            data: ratings,
            averageStars: Math.round(avgStars * 10) / 10,
            totalRatings: ratings.length
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Gagal mengambil data rating." })
    }
}
