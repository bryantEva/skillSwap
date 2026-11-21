import type { RequestHandler } from "express"
import jwt from "jsonwebtoken"

export interface JwtPayload {
    userId: number
    email: string
}

// Extend Express Request agar bisa akses req.user
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload
        }
    }
}

export const verifyToken: RequestHandler = (req, res, next) => {
    const authHeader = req.headers["authorization"]
    const token = authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : null

    if (!token) {
        res.status(401).json({ error: "Token tidak ditemukan. Silakan login terlebih dahulu." })
        return
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
        res.status(500).json({
            error: "JWT_SECRET belum dikonfigurasi."
        });
        return;
    }

    try {
        const decoded = jwt.verify(token, secret) as JwtPayload;
        req.user = decoded;
        next();
    } catch {
        res.status(401).json({
            error: "Token tidak valid atau sudah kadaluarsa."
        });
    }
}
