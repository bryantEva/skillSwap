import type { PublicUser, UserSkill } from "../types"

export interface MatchResult {
    user: PublicUser
    score: number // 0..100
    teaches: UserSkill[]
    wants: UserSkill[]
    /** Dia mengajarkan sesuatu yang ingin kamu pelajari */
    canTeachYou: boolean
    /** Dia ingin belajar sesuatu yang bisa kamu ajarkan → bisa swap 2 arah */
    canSwap: boolean
    /** Ada skill yang dia tawarkan dengan harga koin */
    hasPaid: boolean
}

type SkillRef = { id: number; categoryId?: number }

function ref(us: UserSkill): SkillRef {
    return { id: us.skill.id, categoryId: us.skill.categoryId ?? us.skill.category?.id }
}

/** 1 = skill sama, 0.5 = kategori sama, 0 = tidak cocok */
function bestOverlap(needs: SkillRef[], offers: SkillRef[]) {
    if (needs.length === 0) return 0
    let total = 0
    for (const n of needs) {
        let best = 0
        for (const o of offers) {
            if (o.id === n.id) {
                best = 1
                break
            }
            if (n.categoryId != null && o.categoryId === n.categoryId) best = Math.max(best, 0.5)
        }
        total += best
    }
    return total / needs.length
}

export function computeMatch(mySkills: UserSkill[], other: PublicUser): MatchResult {
    const myWant = mySkills.filter((s) => s.type === "LEARNING").map(ref)
    const myTeach = mySkills.filter((s) => s.type === "OFFERING").map(ref)
    const teaches = other.userSkills.filter((s) => s.type === "OFFERING")
    const wants = other.userSkills.filter((s) => s.type === "LEARNING")

    const a = bestOverlap(myWant, teaches.map(ref)) // dia bisa ngajarin aku
    const b = bestOverlap(myTeach, wants.map(ref)) // aku bisa ngajarin dia

    let score = 0
    if (myWant.length && myTeach.length) score = 0.65 * a + 0.35 * b
    else if (myWant.length) score = a
    else if (myTeach.length) score = b

    return {
        user: other,
        score: Math.round(score * 100),
        teaches,
        wants,
        canTeachYou: a > 0,
        canSwap: b > 0 && teaches.length > 0,
        hasPaid: teaches.some((s) => s.offeredCoins > 0)
    }
}

/** Judul singkat user, misal "Figma Teacher" dari skill OFFERING pertama */
export function headline(skills: UserSkill[]) {
    const teach = skills.filter((s) => s.type === "OFFERING")
    if (teach.length === 0) {
        const learn = skills.filter((s) => s.type === "LEARNING")
        return learn.length ? `Learning ${learn[0].skill.name}` : "New member"
    }
    const names = teach.slice(0, 2).map((s) => s.skill.name)
    return `Teaches ${names.join(" & ")}`
}
