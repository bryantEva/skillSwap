import { RequestHandler } from "express";
import { prisma } from "../prisma.js";

export const addSkill: RequestHandler<{ userId: string }> = async (req, res) => {
    const userId = req.params.userId
    const data = req.body

    // Validasi input wajib
    if (!data.skillName || typeof data.skillName !== "string" || !data.skillName.trim()) {
        res.status(400).json({ error: "skillName wajib diisi." })
        return
    }

    if (!data.categoryId || isNaN(parseInt(data.categoryId))) {
        res.status(400).json({ error: "categoryId wajib diisi dan harus berupa angka." })
        return
    }

    const validTypes = ["OFFERING", "LEARNING"]
    if (!data.type || !validTypes.includes(data.type)) {
        res.status(400).json({ error: `type wajib diisi. Pilih: ${validTypes.join(", ")}` })
        return
    }

    const validLevels = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]
    if (!data.proficiencyLevel || !validLevels.includes(data.proficiencyLevel)) {
        res.status(400).json({ error: `proficiencyLevel wajib diisi. Pilih: ${validLevels.join(", ")}` })
        return
    }

    try {
        let skill = await prisma.skill.findUnique({
            where: { name: data.skillName.trim() }
        })
        if (!skill) {
            skill = await prisma.skill.create({
                data: {
                    name: data.skillName.trim(),
                    categoryId: parseInt(data.categoryId),
                    description: data.description ?? null
                }
            })

        }
        const newUserSkill = await prisma.userSkill.create({
            data: {
                userId: parseInt(userId),
                skillId: skill.id,
                type: data.type,
                proficiencyLevel: data.proficiencyLevel,
                offeredCoins: parseInt(data.offeredCoins) || 0
            }
        })

        res.status(201).json({
            msg: "Skill berhasil ditambahkan ke profil",
            data: newUserSkill
        })
    } catch (error: any) {
        console.error(error)
        if (error.code === "P2002") {
            res.status(409).json({ error: "Skill dengan tipe ini sudah ada di profilmu." })
            return
        }
        res.status(500).json({
            error: "Skill gagal ditambahkan ke profil."
        })
    }
}

export const getSkills: RequestHandler = async (req, res) => {

    const result = await prisma.skill.findMany()

    res.status(200).json(result)
}

export const getCategories: RequestHandler = async (req, res) => {

    const result = await prisma.category.findMany()

    res.status(200).json(result)
}
