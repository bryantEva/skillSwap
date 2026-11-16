import type { RequestHandler } from "express"
import { prisma } from "../prisma.js"

// ─── Get semua skill milik user ───────────────────────────────────────────────
export const getUserSkills: RequestHandler<{ userId: string }> = async (req, res) => {
    const userId = parseInt(req.params.userId)

    try {
        const user = await prisma.user.findUnique({ where: { id: userId } })
        if (!user) {
            res.status(404).json({ error: "User tidak ditemukan." })
            return
        }

        const skills = await prisma.userSkill.findMany({
            where: { userId },
            include: {
                skill: {
                    include: { category: { select: { id: true, name: true } } }
                }
            },
            orderBy: { createdAt: "desc" }
        })

        res.status(200).json({ data: skills })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Gagal mengambil data skill user." })
    }
}

// ─── Delete UserSkill ─────────────────────────────────────────────────────────
export const deleteUserSkill: RequestHandler<{ userSkillId: string }> = async (req, res) => {
    const userSkillId = parseInt(req.params.userSkillId)

    try {
        const userSkill = await prisma.userSkill.findUnique({
            where: { id: userSkillId }
        })

        if (!userSkill) {
            res.status(404).json({ error: "Data skill tidak ditemukan." })
            return
        }

        // Authorization: hanya pemilik skill yang boleh menghapus
        if (req.user?.userId !== userSkill.userId) {
            res.status(403).json({ error: "Kamu tidak diizinkan menghapus skill milik user lain." })
            return
        }

        await prisma.userSkill.delete({ where: { id: userSkillId } })

        res.status(200).json({ message: "Skill berhasil dihapus dari profil." })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Gagal menghapus skill." })
    }
}
