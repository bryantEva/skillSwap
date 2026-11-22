import type {
    AuthUser,
    Category,
    CertificateDetail,
    CoinOrder,
    CoinPackage,
    CoinTransaction,
    ProficiencyLevel,
    PublicUser,
    RatingsResponse,
    Session,
    SessionStatus,
    Skill,
    SkillOfferType,
    SubscriptionResponse,
    UserCertificate,
    UserProfile,
    UserSkill
} from "../types"

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "/api"
const TOKEN_KEY = "skillswap.token"

export class ApiError extends Error {
    status: number
    constructor(message: string, status: number) {
        super(message)
        this.status = status
    }
}

export const tokenStore = {
    get: () => {
        try {
            return localStorage.getItem(TOKEN_KEY)
        } catch {
            return null
        }
    },
    set: (token: string) => {
        try {
            localStorage.setItem(TOKEN_KEY, token)
        } catch {
            /* storage tidak tersedia */
        }
    },
    clear: () => {
        try {
            localStorage.removeItem(TOKEN_KEY)
        } catch {
            /* storage tidak tersedia */
        }
    }
}

/** Dipanggil saat token ditolak (401) supaya AuthContext bisa logout. */
let onUnauthorized: (() => void) | null = null
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
    onUnauthorized = fn
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {}
    const token = tokenStore.get()
    if (token) headers.Authorization = `Bearer ${token}`
    if (body !== undefined) headers["Content-Type"] = "application/json"

    let res: Response
    try {
        res = await fetch(`${BASE_URL}${path}`, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined
        })
    } catch {
        throw new ApiError("Tidak bisa terhubung ke server. Pastikan BE sudah jalan.", 0)
    }

    const text = await res.text()
    let json: any = null
    if (text) {
        try {
            json = JSON.parse(text)
        } catch {
            json = null
        }
    }

    if (!res.ok) {
        if (res.status === 401 && token) onUnauthorized?.()
        const message =
            json?.error ??
            (res.status >= 500 || res.status === 0
                ? "Server sedang bermasalah. Coba lagi sebentar."
                : `Request gagal (${res.status}).`)
        throw new ApiError(message, res.status)
    }

    return json as T
}

const get = <T>(path: string) => request<T>("GET", path)
const post = <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {})
const put = <T>(path: string, body?: unknown) => request<T>("PUT", path, body ?? {})
const patch = <T>(path: string, body?: unknown) => request<T>("PATCH", path, body ?? {})
const del = <T>(path: string) => request<T>("DELETE", path)

// ─── Endpoints (lihat BE/src/index.ts) ───────────────────────────────────────
export const api = {
    // Auth
    login: (email: string, password: string) =>
        post<{ message: string; token: string; user: AuthUser }>("/login", { email, password }),
    register: (name: string, email: string, password: string) =>
        post<{ message: string; user: { id: number; email: string; name: string | null } }>("/register", {
            name,
            email,
            password
        }),

    // Master data
    getSkills: () => get<Skill[]>("/skill"),
    getCategories: () => get<Category[]>("/category"),

    // Users
    getUsers: () => get<{ data: PublicUser[] }>("/users").then((r) => r.data),
    getUser: (userId: number) => get<{ data: UserProfile }>(`/user/${userId}`).then((r) => r.data),
    updateUser: (userId: number, data: {
        name?: string;
        avatarUrl?: string;
        whatsappNumber?: string;
        instagramUsername?: string
    }) =>
        put<{ message: string; data: UserProfile }>(`/user/${userId}`, data),

    // User skills
    getUserSkills: (userId: number) => get<{ data: UserSkill[] }>(`/user/${userId}/skills`).then((r) => r.data),
    addUserSkill: (
        userId: number,
        data: {
            skillName: string
            categoryId: number
            type: SkillOfferType
            proficiencyLevel: ProficiencyLevel
            offeredCoins?: number
            description?: string
        }
    ) => post<{ msg: string; data: UserSkill }>(`/user/${userId}/skill`, data),
    deleteUserSkill: (userSkillId: number) => del<{ message: string }>(`/user-skill/${userSkillId}`),

    // Sessions
    createSession: (
        userId: number,
        data: {
            type: "ONE_WAY" | "TWO_WAY"
            teacherId: number
            skillId: number
            exchangeSkillId?: number
            coinAmount?: number
            scheduledAt: string
        }
    ) => post<{ message: string; data: Session | Session[] }>(`/user/${userId}/session`, data),
    getSessions: (userId: number) => get<{ data: Session[] }>(`/user/${userId}/sessions`).then((r) => r.data),
    getSession: (sessionId: number) => get<{ data: Session }>(`/session/${sessionId}`).then((r) => r.data),
    updateSessionStatus: (sessionId: number, status: Exclude<SessionStatus, "PENDING">) =>
        patch<{ message: string; data: Session }>(`/session/${sessionId}/status`, { status }),

    // Rating
    addRating: (sessionId: number, data: { stars: number; comment?: string }) =>
        post<{ message: string }>(`/session/${sessionId}/rating`, data),
    getUserRatings: (userId: number) => get<RatingsResponse>(`/user/${userId}/ratings`),

    // Certificate
    getCertificate: (sessionId: number) =>
        get<{ data: CertificateDetail }>(`/session/${sessionId}/certificate`).then((r) => r.data),
    getUserCertificates: (userId: number) =>
        get<{ data: UserCertificate[] }>(`/user/${userId}/certificates`).then((r) => r.data),

    // Coins
    getCoinTransactions: (userId: number) =>
        get<{ data: CoinTransaction[] }>(`/user/${userId}/coins`).then((r) => r.data),
    claimDaily: (userId: number) => post<{ message: string; coins: number }>(`/user/${userId}/daily-login`),

    getCoinPackages: () => get<{ data: CoinPackage[] }>("/coin-packages").then((r) => r.data),
    createCoinOrder: (userId: number, packageId: number) =>
        post<{ message: string; data: CoinOrder }>(`/user/${userId}/coin-orders`, { packageId }),
    simulatePay: (orderCode: string) =>
        post<{ message: string }>(`/coin-orders/${orderCode}/simulate-pay`),
    getCoinOrders: (userId: number) =>
        get<{ data: CoinOrder[] }>(`/user/${userId}/coin-orders`).then((r) => r.data),

    // Subscription
    getSubscription: (userId: number) => get<SubscriptionResponse>(`/user/${userId}/subscription`),
    buySubscription: (userId: number, planName: string) =>
        post<{ message: string }>(`/user/${userId}/subscription`, { planName })
}
