import type { RequestHandler } from "express"
import { prisma } from "../prisma.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import "dotenv/config"

export const login: RequestHandler = async (req, res) => {
    const data = req.body

    if (!data.email || !data.password) {
        res.status(400).json({ error: "Email dan password wajib diisi." })
        return
    }

    try {
        const user = await prisma.user.findFirst({
            where: { email: data.email }
        })

        if (!user || !bcrypt.compareSync(data.password, user.password)) {
            res.status(401).json({ error: "Email atau password salah." })
            return
        }

        const token = jwt.sign(
            { userId: user.id, email: user.email },
            process.env.JWT_SECRET!,
            { expiresIn: "7d" }
        )

        res.status(200).json({
            message: "Login berhasil.",
            token,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatarUrl,
                coins: user.coins
            }
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: "Terjadi kesalahan saat login." })
    }
}

export const register: RequestHandler = async (req, res) => {
    const data = req.body

    if (!data.email || !data.password) {
        res.status(400).json({ error: "Email dan password wajib diisi." })
        return
    }

    try {
        const hashedPassword = bcrypt.hashSync(data.password, 10)

        const result = await prisma.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                name: data.name ?? null
            }
        })

        res.status(201).json({
            message: "Registrasi berhasil.",
            user: {
                id: result.id,
                email: result.email,
                name: result.name
            }
        })
    } catch (error: any) {
        console.error(error)
        if (error.code === "P2002") {
            res.status(409).json({ error: "Email sudah terdaftar." })
            return
        }
        res.status(500).json({ error: "Registrasi gagal." })
    }
}
