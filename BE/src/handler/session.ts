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
    const when = new Date(data.scheduledAt)
    if (Number.isNaN(when.getTime()) || when.getTime() < Date.now()) {
        res.status(400).json({ error: "Jadwal tidak valid atau sudah lewat." })
        return
    }

    // Validasi teacher tidak boleh sama dengan student
    if (teacherId === studentId) {
        res.status(400).json({ error: "Teacher dan student tidak boleh orang yang sama." })
        return
    }

    try {
        if (req.user?.userId !== studentId) {
            res.status(403).json({ error: "Tidak diizinkan." })
            return
        }
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
                        requesterId: studentId,
                        skillId: parseInt(data.skillId),
                        exchangeSkillId: parseInt(data.exchangeSkillId),
                        type: "TWO_WAY",
                        coinAmount: 0,
                        scheduledAt: when
                    }
                }),
                prisma.session.create({
                    data: {
                        studentId: teacherId,
                        teacherId: studentId,
                        requesterId: studentId,
                        skillId: parseInt(data.exchangeSkillId),
                        exchangeSkillId: parseInt(data.skillId),
                        type: "TWO_WAY",
                        coinAmount: 0,
                        scheduledAt: when
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
            const skillId = parseInt(data.skillId)

            const offering = await prisma.userSkill.findUnique({
                where: {
                    userId_skillId_type: { userId: teacherId, skillId, type: "OFFERING" }
                }
            })

            if (!offering) {
                res.status(400).json({ error: "Teacher tidak mengajarkan skill ini." })
                return
            }

            // Kalau teacher mematok harga, pakai harga itu.
            // Kalau harganya 0 (fleksibel), pakai tawaran student.
            const price = offering.offeredCoins > 0 ? offering.offeredCoins : finalCoinAmount

            if (price <= 0) {
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

            if (student.coins < price) {
                res.status(400).json({
                    error: `Saldo koin tidak mencukupi. Saldo: ${student.coins}, Dibutuhkan: ${price}`
                })
                return
            }

            // Escrow: potong coins student, hold ke escrowCoins, catat transaksi (satu transaksi)
            const [newSession] = await prisma.$transaction([
                prisma.session.create({
                    data: {
                        studentId,
                        teacherId,
                        requesterId: studentId,
                        skillId,
                        type: "ONE_WAY",
                        coinAmount: price,
                        scheduledAt: when,
                        transactions: {
                            create: {
                                userId: studentId,
                                amount: -price,
                                type: "ESCROW_HOLD",
                                description: "Escrow untuk sesi baru"
                            }
                        }
                    }
                }),
                prisma.user.update({
                    where: { id: studentId },
                    data: {
                        coins: { decrement: price },
                        escrowCoins: { increment: price }
                    }
                })
            ])

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
                ratings: true,
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
                ratings: true,
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


    const validStatuses = ["CONFIRMED", "ONGOING", "COMPLETED", "CANCELLED"]
    if (!validStatuses.includes(status)) {
        res.status(400).json({ error: `Status tidak valid. Gunakan: ${validStatuses.join(", ")}` })
        return
    }

    const allowedTransitions: Record<string, string[]> = {
        PENDING: ["CONFIRMED", "CANCELLED"],
        CONFIRMED: ["ONGOING", "CANCELLED"],
        ONGOING: ["COMPLETED", "CANCELLED"],
        COMPLETED: [],
        CANCELLED: []
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

        if (!allowedTransitions[session.status].includes(status)) {
            res.status(400).json({
                error: `Tidak bisa mengubah status dari ${session.status} ke ${status}.`
            })
            return
        }

        if (status === "CONFIRMED") {
            const requesterOfSession = session.requesterId ?? session.studentId
            if (requesterOfSession === requesterId) {
                res.status(403).json({ error: "Sesi ini harus disetujui oleh pihak lain." })
                return
            }

            // TWO_WAY: konfirmasi juga record kembarannya (peran terbalik)
            await prisma.session.updateMany({
                where: {
                    status: "PENDING",
                    OR: [
                        { id: session.id },
                        ...(session.type === "TWO_WAY"
                            ? [{
                                type: "TWO_WAY" as const,
                                teacherId: session.studentId,
                                studentId: session.teacherId,
                                scheduledAt: session.scheduledAt
                            }]
                            : [])
                    ]
                },
                data: { status: "CONFIRMED" }
            })

            const updated = await prisma.session.findUnique({ where: { id: sessionId } })
            res.status(200).json({ message: "Sesi disetujui.", data: updated })
            return
        }

        if (status === "COMPLETED" && session.type === "ONE_WAY" && requesterId !== session.studentId) {
            res.status(403).json({ error: "Hanya student yang bisa menyelesaikan sesi berbayar." })
            return
        }

        // ─── COMPLETED: payout koin ke teacher ───────────────────────────────
        if (status === "COMPLETED" && session.type === "ONE_WAY" && session.coinAmount > 0) {
            const certNo = `CERT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(session.id).padStart(5, "0")}`
            const skill = await prisma.skill.findUnique({ where: { id: session.skillId } })

            try {
                await prisma.$transaction(async (tx) => {
                    // 1. Penjaga: hanya satu request yang lolos
                    const claimed = await tx.session.updateMany({
                        where: { id: sessionId, status: "ONGOING" },
                        data: { status: "COMPLETED", completedAt: new Date() }
                    })
                    if (claimed.count === 0) throw new Error("ALREADY_PROCESSED")

                    // 2. Baru setelah lolos, urus koin
                    await tx.user.update({
                        where: { id: session.studentId },
                        data: { escrowCoins: { decrement: session.coinAmount } }
                    })
                    await tx.user.update({
                        where: { id: session.teacherId },
                        data: { coins: { increment: session.coinAmount } }
                    })
                    await tx.coinTransaction.create({
                        data: {
                            userId: session.teacherId,
                            sessionId: session.id,
                            amount: session.coinAmount,
                            type: "TEACHER_PAYOUT",
                            description: `Pembayaran dari sesi #${session.id}`
                        }
                    })
                    await tx.userSkill.deleteMany({
                        where: { userId: session.studentId, skillId: session.skillId, type: "LEARNING" }
                    })
                    await tx.certificate.create({
                        data: {
                            certificateNo: certNo,
                            sessionId: session.id,
                            studentId: session.studentId,
                            teacherId: session.teacherId,
                            skillName: skill?.name ?? "Unknown Skill"
                        }
                    })
                })
            } catch (e) {
                if ((e as Error).message === "ALREADY_PROCESSED") {
                    res.status(409).json({ error: "Sesi sudah diproses." })
                    return
                }
                throw e
            }

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
            const certNo = `CERT-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(session.id).padStart(5, "0")}`

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
                }),
                prisma.userSkill.deleteMany({
                    where: {
                        userId: session.studentId,
                        skillId: session.skillId,
                        type: "LEARNING"
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

        if (status === "CANCELLED" && session.type === "TWO_WAY") {
            await prisma.session.updateMany({
                where: {
                    status: { in: ["PENDING", "CONFIRMED", "ONGOING"] },
                    OR: [
                        { id: session.id },
                        {
                            type: "TWO_WAY",
                            teacherId: session.studentId,
                            studentId: session.teacherId,
                            scheduledAt: session.scheduledAt
                        }
                    ]
                },
                data: { status: "CANCELLED" }
            })

            const updated = await prisma.session.findUnique({ where: { id: sessionId } })
            res.status(200).json({ message: "Sesi dibatalkan.", data: updated })
            return
        }

        // ─── CANCELLED: refund koin ke student ───────────────────────────────
        if (status === "CANCELLED" && session.type === "ONE_WAY" && session.coinAmount > 0) {
            try {
                await prisma.$transaction(async (tx) => {
                    // 1. Penjaga: hanya satu request yang boleh membatalkan
                    const claimed = await tx.session.updateMany({
                        where: {
                            id: sessionId,
                            status: { in: ["PENDING", "CONFIRMED", "ONGOING"] }
                        },
                        data: { status: "CANCELLED" }
                    })
                    if (claimed.count === 0) throw new Error("ALREADY_PROCESSED")

                    // 2. Kembalikan koin dari escrow ke saldo student
                    await tx.user.update({
                        where: { id: session.studentId },
                        data: {
                            coins: { increment: session.coinAmount },
                            escrowCoins: { decrement: session.coinAmount }
                        }
                    })

                    // 3. Catat transaksi refund
                    await tx.coinTransaction.create({
                        data: {
                            userId: session.studentId,
                            sessionId: session.id,
                            amount: session.coinAmount,
                            type: "REFUND",
                            description: `Refund dari sesi #${session.id} yang dibatalkan`
                        }
                    })
                })
            } catch (e) {
                if ((e as Error).message === "ALREADY_PROCESSED") {
                    res.status(409).json({ error: "Sesi sudah diproses." })
                    return
                }
                throw e
            }

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
