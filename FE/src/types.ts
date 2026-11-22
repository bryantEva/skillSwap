// Tipe data mengikuti response BE (BE/src/handler/*.ts & prisma/schema.prisma)

export type SessionType = "TWO_WAY" | "ONE_WAY"
export type SessionStatus = "PENDING" | "ONGOING" | "COMPLETED" | "CANCELLED"
export type SkillOfferType = "OFFERING" | "LEARNING"
export type ProficiencyLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT"
export type TransactionType =
    | "DAILY_LOGIN"
    | "ESCROW_HOLD"
    | "TEACHER_PAYOUT"
    | "REFUND"
    | "SUBSCRIPTION_PAYMENT"
    | "WITHDRAWAL"
    | "COIN_PURCHASE"

export interface AuthUser {
    id: number
    email: string
    name: string | null
    avatarUrl: string | null
    coins: number
}

export interface Category {
    id: number
    name: string
    icon: string | null
}

export interface Skill {
    id: number
    categoryId: number
    name: string
    description: string | null
}

export interface UserSkill {
    id: number
    userId: number
    skillId: number
    type: SkillOfferType
    proficiencyLevel: ProficiencyLevel
    offeredCoins: number
    userNotes: string | null
    createdAt: string
    skill: { id: number; name: string; categoryId?: number; category?: { id: number; name: string } }
}

export interface Subscription {
    id: number
    userId: number
    planName: string
    status: string
    startDate: string
    endDate: string
}

export interface UserProfile {
    instagramUsername: any
    id: number
    email: string
    name: string | null
    avatarUrl: string | null
    whatsappNumber: string | null
    isntagramUsername: string | null
    coins: number
    escrowCoins: number
    isVerified: boolean
    createdAt: string
    userSkills: UserSkill[]
    subscriptions: Subscription[]
}

/** Item dari GET /users (endpoint browse/matching) */
export interface PublicUser {
    id: number
    name: string | null
    avatarUrl: string | null
    isVerified: boolean
    userSkills: UserSkill[]
    averageStars: number
    totalRatings: number
    completedSessions: number
}

export interface MiniUser {
    id: number
    name: string | null
    avatarUrl: string | null
}

export interface Rating {
    id: number
    sessionId: number
    reviewerId: number
    revieweeId: number
    stars: number
    comment: string | null
    createdAt: string
}

export interface Certificate {
    id: number
    certificateNo: string
    sessionId: number
    studentId: number
    teacherId: number
    skillName: string
    issuedAt: string
}

export interface CoinTransactionLite {
    id: number
    userId: number
    sessionId: number | null
    amount: number
    type: TransactionType
    description: string | null
    createdAt: string
}

export interface CoinPackage { id: number; name: string; coins: number; price: number }
export interface CoinOrder {
    id: number
    orderCode: string
    coins: number
    amount: number
    status: "PENDING" | "PAID" | "FAILED" | "EXPIRED"
    createdAt: string
    package?: { name: string }
}

export interface Session {
    id: number
    type: SessionType
    status: SessionStatus
    coinAmount: number
    scheduledAt: string
    completedAt: string | null
    teacherId: number
    studentId: number
    skillId: number
    exchangeSkillId: number | null
    createdAt: string
    updatedAt: string
    teacher: MiniUser
    student: MiniUser
    skill: { id: number; name: string }
    ratings: Rating[]
    certificate: Certificate | null
    transactions?: CoinTransactionLite[]
}

export interface RatingWithReviewer extends Rating {
    reviewer: MiniUser
    session: { id: number; skill: { name: string } }
}

export interface RatingsResponse {
    data: RatingWithReviewer[]
    averageStars: number
    totalRatings: number
}

export interface CertificateDetail extends Certificate {
    student: { id: number; name: string | null; email: string }
    teacher: { id: number; name: string | null; email: string }
    session: {
        id: number
        type: SessionType
        scheduledAt: string
        completedAt: string | null
        skill: { name: string }
    }
}

export interface UserCertificate extends Certificate {
    teacher: { id: number; name: string | null }
    session: { scheduledAt: string; completedAt: string | null; skill: { name: string } }
}

export interface CoinTransaction extends CoinTransactionLite {
    session: { id: number; type: SessionType; skill: { name: string } } | null
}

export interface SubscriptionResponse {
    active: Subscription | null
    history: Subscription[]
}
