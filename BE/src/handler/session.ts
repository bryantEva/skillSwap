import type { RequestHandler } from "express"
import { prisma } from "../prisma.js"

// ─── Buat Session ─────────────────────────────────────────────────────────────
export const addSession: RequestHandler<{ userId: string }> = async (req, res) => {
    const studentId = parseInt(req.params.userId)
    const data = req.body
    const finalCoinAmount = parseInt(data.coinAmount) || 0

    // Validasi input dasar
    if (!data.type || !data.teacherId || !data.skillId || !data.scheduledAt) {
        res.status(400).json({ error: "type, teacherId, skillId, dan scheduledAt wajib diisi." })
        return
    }

    const teacherId = parseInt(data.teacherId)

    // Validasi teacher tidak boleh sama dengan student
    if (teacherId === studentId) {
        res.status(400).json({ error: "Teacher dan student tidak boleh orang yang sama." })
        return
    }

    try {
        if (data.type === "TWO_WAY") {
            if (!data.exchangeSkillId) {
                res.status(400).json({ error: "Sesi TWO_WAY wajib menyertakan exchangeSkillId." })
                return
            }

            const [session1, session2] = await prisma.$transaction([
                prisma.session.create({
                    data: {
                        studentId,
                        teacherId,
                        skillId: parseInt(data.skillId),
                        exchangeSkillId: parseInt(data.exchangeSkillId),
                        type: "TWO_WAY",
                        coinAmount: 0,
                        scheduledAt: new Date(data.scheduledAt)
                    }
                }),
                prisma.session.create({
                    data: {
                        studentId: teacherId,
                        teacherId: studentId,
                        skillId: parseInt(data.exchangeSkillId),
                        exchangeSkillId: parseInt(data.skillId),
                        type: "TWO_WAY",
                        coinAmount: 0,
                        scheduledAt: new Date(data.scheduledAt)
                    }
                })
            ])

            res.status(201).json({
                message: "Sesi TWO_WAY berhasil dibuat. Dua jadwal saling silang telah ditambahkan.",
                data: [session1, session2]
            })
            return
        }

        if (data.type === "ONE_WAY") {
            if (finalCoinAmount <= 0) {
                res.status(400).json({ error: "Sesi ONE_WAY wajib menyertakan harga koin > 0." })
                return
            }

            const student = await prisma.user.findUnique({
                where: { id: studentId },
                select: { coins: true }
            })

            if (!student) {
                res.status(404).json({ error: "User tidak ditemukan." })
                return
            }

            if (student.coins < finalCoinAmount) {
                res.status(400).json({
                    error: `Saldo koin tidak mencukupi. Saldo: ${student.coins}, Dibutuhkan: ${finalCoinAmount}`
                })
                return
            }

            // Escrow: potong coins student, hold ke escrowCoins
            const [newSession] = await prisma.$transaction([
                prisma.session.create({
                    data: {
                        studentId,
                        teacherId,
                        skillId: parseInt(data.skillId),
                        type: "ONE_WAY",
                        coinAmount: finalCoinAmount,
                        scheduledAt: new Date(data.scheduledAt)
                    }
                }),
                prisma.user.update({
                    where: { id: studentId },
                    data: {
                        coins: { decrement: finalCoinAmount },
                        escrowCoins: { increment: finalCoinAmount }
                    }
                })
            ])

            // Simpan transaksi escrow (perlu sessionId, jadi di luar transaction)
            await prisma.coinTransaction.create({
                data: {
                    userId: studentId,
                    sessionId: newSession.id,
                    amount: -finalCoinAmount,
                    type: "ESCROW_HOLD",
                    description: `Escrow untuk sesi #${newSession.id}`
                }
            })

            res.status(201).json({
                message: "Sesi ONE_WAY berhasil dibuat. Koin ditahan di escrow.",
                data: newSession
            })
            return
        }

        res.status(400).json({ error: "Tipe sesi tidak dikenali. Gunakan ONE_WAY atau TWO_WAY." })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Gagal membuat sesi." })
    }
}

// ─── Get Sessions (milik user, sebagai teacher atau student) ──────────────────
export const getSessions: RequestHandler<{ userId: string }> = async (req, res) => {
    const userId = parseInt(req.params.userId)

    try {
        const sessions = await prisma.session.findMany({
            where: {
                OR: [
                    { teacherId: userId },
                    { studentId: userId }
                ]
            },
            include: {
                teacher: { select: { id: true, name: true, avatarUrl: true } },
                student: { select: { id: true, name: true, avatarUrl: true } },
                skill: { select: { id: true, name: true } },
                rating: true,
                certificate: true
            },
            orderBy: { scheduledAt: "desc" }
        })

        res.status(200).json({ data: sessions })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Gagal mengambil data sesi." })
    }
}

// ─── Get Session By ID ────────────────────────────────────────────────────────
export const getSessionById: RequestHandler<{ sessionId: string }> = async (req, res) => {
    const sessionId = parseInt(req.params.sessionId)

    try {
        const session = await prisma.session.findUnique({
            where: { id: sessionId },
            include: {
                teacher: { select: { id: true, name: true, avatarUrl: true } },
                student: { select: { id: true, name: true, avatarUrl: true } },
                skill: { select: { id: true, name: true } },
                transactions: true,
                rating: true,
                certificate: true
            }
        })

        if (!session) {
            res.status(404).json({ error: "Sesi tidak ditemukan." })
            return
        }

        res.status(200).json({ data: session })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Gagal mengambil detail sesi." })
    }
}

// ─── Update Status Session ────────────────────────────────────────────────────
// PENDING -> ONGOING -> COMPLETED (payout ke teacher)
// PENDING/ONGOING -> CANCELLED (refund ke student)
export const updateSessionStatus: RequestHandler<{ sessionId: string }> = async (req, res) => {
    const sessionId = parseInt(req.params.sessionId)
    const { status } = req.body

    const validStatuses = ["ONGOING", "COMPLETED", "CANCELLED"]
    if (!validStatuses.includes(status)) {
        res.status(400).json({ error: `Status tidak valid. Gunakan: ${validStatuses.join(", ")}` })
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

        // Authorization: hanya teacher atau student dari sesi yang bisa update status
        const requesterId = req.user!.userId
        if (session.teacherId !== requesterId && session.studentId !== requesterId) {
            res.status(403).json({ error: "Kamu tidak diizinkan mengubah status sesi ini." })
            return
        }

        // Validasi transisi status
        const allowedTransitions: Record<string, string[]> = {
            PENDING: ["ONGOING", "CANCELLED"],
            ONGOING: ["COMPLETED", "CANCELLED"],
            COMPLETED: [],
            CANCELLED: []
        }

        if (!allowedTransitions[session.status].includes(status)) {
            res.status(400).json({
                error: `Tidak bisa mengubah status dari ${session.status} ke ${status}.`
            })
            return
        }

        // ─── COMPLETED: payout koin ke teacher ───────────────────────────────
        if (status === "COMPLETED" && session.type === "ONE_WAY" && session.coinAmount > 0) {
            await prisma.$transaction([
                // Update status sesi
                prisma.session.update({
                    where: { id: sessionId },
                    data: { status: "COMPLETED", completedAt: new Date() }
                }),
                // Kurangi escrow student
                prisma.user.update({
                    where: { id: session.studentId },
                    data: { escrowCoins: { decrement: session.coinAmount } }
                }),
                // Tambah coins teacher
                prisma.user.update({
                    where: { id: session.teacherId },
                    data: { coins: { increment: session.coinAmount } }
                }),
                // Catat transaksi payout
                prisma.coinTransaction.create({
                    data: {
                        userId: session.teacherId,
                        sessionId: session.id,
                        amount: session.coinAmount,
                        type: "TEACHER_PAYOUT",
                        description: `Pembayaran dari sesi #${session.id}`
                    }
                })
            ])

            // Auto-generate certificate
            const certCount = await prisma.certificate.count()
            const certNo = `CERT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(certCount + 1).padStart(3, "0")}`
            const skill = await prisma.skill.findUnique({ where: { id: session.skillId } })

            await prisma.certificate.create({
                data: {
                    certificateNo: certNo,
                    sessionId: session.id,
                    studentId: session.studentId,
                    teacherId: session.teacherId,
                    skillName: skill?.name ?? "Unknown Skill"
                }
            })

            const updatedSession = await prisma.session.findUnique({ where: { id: sessionId } })
            res.status(200).json({
                message: "Sesi selesai. Koin dikirim ke pengajar dan sertifikat diterbitkan.",
                data: updatedSession
            })
            return
        }

        // ─── COMPLETED TWO_WAY: update status saja ───────────────────────────
        if (status === "COMPLETED" && session.type === "TWO_WAY") {
            const skill = await prisma.skill.findUnique({ where: { id: session.skillId } })
            const certCount = await prisma.certificate.count()
            const certNo = `CERT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(certCount + 1).padStart(3, "0")}`

            await prisma.$transaction([
                prisma.session.update({
                    where: { id: sessionId },
                    data: { status: "COMPLETED", completedAt: new Date() }
                }),
                prisma.certificate.create({
                    data: {
                        certificateNo: certNo,
                        sessionId: session.id,
                        studentId: session.studentId,
                        teacherId: session.teacherId,
                        skillName: skill?.name ?? "Unknown Skill"
                    }
                })
            ])

            const updatedSession = await prisma.session.findUnique({ where: { id: sessionId } })
            res.status(200).json({
                message: "Sesi TWO_WAY selesai. Sertifikat diterbitkan.",
                data: updatedSession
            })
            return
        }

        // ─── CANCELLED: refund koin ke student ───────────────────────────────
        if (status === "CANCELLED" && session.type === "ONE_WAY" && session.coinAmount > 0) {
            await prisma.$transaction([
                prisma.session.update({
                    where: { id: sessionId },
                    data: { status: "CANCELLED" }
                }),
                // Kembalikan coins ke student
                prisma.user.update({
                    where: { id: session.studentId },
                    data: {
                        coins: { increment: session.coinAmount },
                        escrowCoins: { decrement: session.coinAmount }
                    }
                }),
                // Catat transaksi refund
                prisma.coinTransaction.create({
                    data: {
                        userId: session.studentId,
                        sessionId: session.id,
                        amount: session.coinAmount,
                        type: "REFUND",
                        description: `Refund dari sesi #${session.id} yang dibatalkan`
                    }
                })
            ])

            const updatedSession = await prisma.session.findUnique({ where: { id: sessionId } })
            res.status(200).json({
                message: "Sesi dibatalkan. Koin dikembalikan ke student.",
                data: updatedSession
            })
            return
        }

        // ─── Status lainnya (misal ONGOING, atau CANCELLED TWO_WAY) ──────────
        const updatedSession = await prisma.session.update({
            where: { id: sessionId },
            data: { status: status as any }
        })

        res.status(200).json({
            message: `Status sesi berhasil diubah menjadi ${status}.`,
            data: updatedSession
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Gagal mengubah status sesi." })
    }
}
