import type { RequestHandler } from "express"
import { prisma } from "../prisma.js"

// ─── Get Certificate by Session ID ───────────────────────────────────────────
export const getCertificate: RequestHandler<{ sessionId: string }> = async (req, res) => {
    const sessionId = parseInt(req.params.sessionId)

    try {
        const certificate = await prisma.certificate.findUnique({
            where: { sessionId },
            include: {
                student: { select: { id: true, name: true } },
                teacher: { select: { id: true, name: true } },
                session: {
                    select: {
                        id: true,
                        type: true,
                        scheduledAt: true,
                        completedAt: true,
                        skill: { select: { name: true } }
                    }
                }
            }
        })

        if (!certificate) {
            res.status(404).json({ error: "Sertifikat tidak ditemukan untuk sesi ini." })
            return
        }

        const viewerId = req.user!.userId
        if (certificate.studentId !== viewerId && certificate.teacherId !== viewerId) {
            res.status(403).json({ error: "Tidak diizinkan." })
            return
        }

        res.status(200).json({ data: certificate })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Gagal mengambil sertifikat." })
    }
}

// ─── Get semua Certificate milik seorang user (sebagai student) ───────────────
export const getUserCertificates: RequestHandler<{ userId: string }> = async (req, res) => {
    const userId = parseInt(req.params.userId)
    if (req.user!.userId !== userId) {
        res.status(403).json({ error: "Tidak diizinkan." })
        return
    }

    try {
        const certificates = await prisma.certificate.findMany({
            where: { studentId: userId },
            include: {
                teacher: { select: { id: true, name: true } },
                session: {
                    select: {
                        scheduledAt: true,
                        completedAt: true,
                        skill: { select: { name: true } }
                    }
                }
            },
            orderBy: { issuedAt: "desc" }
        })

        res.status(200).json({ data: certificates })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Gagal mengambil daftar sertifikat." })
    }
}
