import "dotenv/config"
import express from "express"

// Handler
import { login, register } from "./handler/auth.js"
import { addSkill, getSkills, getCategories } from "./handler/skill.js"
import { getUserProfle, updateUserProfile } from "./handler/user.js"
import { addSession, getSessions, getSessionById, updateSessionStatus } from "./handler/session.js"
import { addRating, getUserRatings } from "./handler/rating.js"
import { getCertificate, getUserCertificates } from "./handler/certificate.js"
import { getCoinTransactions, dailyLogin } from "./handler/coin.js"
import { addSubscription, getSubscription } from "./handler/subscription.js"
import { getUserSkills, deleteUserSkill } from "./handler/userSkill.js"

// Middleware
import { verifyToken } from "./middleware/auth.js"

const app = express()
app.use(express.json())

// ─── Public Routes (tidak perlu token) ───────────────────────────────────────
app.post("/register", register)
app.post("/login", login)

app.get("/skill", getSkills)
app.get("/category", getCategories)

// ─── Protected Routes (wajib login / bearer token) ───────────────────────────

// User
app.get("/user/:userId", verifyToken, getUserProfle)
app.put("/user/:userId", verifyToken, updateUserProfile)

// User Skills
app.post("/user/:userId/skill", verifyToken, addSkill)
app.get("/user/:userId/skills", verifyToken, getUserSkills)
app.delete("/user-skill/:userSkillId", verifyToken, deleteUserSkill)

// Sessions
app.post("/user/:userId/session", verifyToken, addSession)
app.get("/user/:userId/sessions", verifyToken, getSessions)
app.get("/session/:sessionId", verifyToken, getSessionById)
app.patch("/session/:sessionId/status", verifyToken, updateSessionStatus)

// Rating
app.post("/session/:sessionId/rating", verifyToken, addRating)
app.get("/user/:userId/ratings", verifyToken, getUserRatings)

// Certificate
app.get("/session/:sessionId/certificate", verifyToken, getCertificate)
app.get("/user/:userId/certificates", verifyToken, getUserCertificates)

// Coin
app.get("/user/:userId/coins", verifyToken, getCoinTransactions)
app.post("/user/:userId/daily-login", verifyToken, dailyLogin)

// Subscription
app.post("/user/:userId/subscription", verifyToken, addSubscription)
app.get("/user/:userId/subscription", verifyToken, getSubscription)

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("[Global Error Handler]", err)
    const status = err.status ?? err.statusCode ?? 500
    const message = err.message ?? "Terjadi kesalahan pada server."
    res.status(status).json({ error: message })
})

app.listen(PORT, () => {
    console.log(`🚀 SkillSwap BE berjalan di http://localhost:${PORT}`)
})
