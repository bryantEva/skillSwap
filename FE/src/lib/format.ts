import type { ProficiencyLevel, SessionStatus } from "../types"

export function firstName(name: string | null | undefined, fallback = "there") {
    if (!name) return fallback
    return name.trim().split(/\s+/)[0] || fallback
}

export function displayName(name: string | null | undefined) {
    return name?.trim() || "SkillSwap member"
}

export function greeting(date = new Date()) {
    const h = date.getHours()
    if (h < 11) return "Good morning"
    if (h < 15) return "Good afternoon"
    if (h < 18) return "Good evening"
    return "Good evening"
}

const dayFmt = new Intl.DateTimeFormat("en-US", { weekday: "long" })
const timeFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" })
const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" })
const shortFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" })

/** "Thursday · 19:00" */
export function formatSlot(iso: string) {
    const d = new Date(iso)
    return `${dayFmt.format(d)} · ${timeFmt.format(d)}`
}

/** "Sep 28, 2026" */
export function formatDate(iso: string) {
    return dateFmt.format(new Date(iso))
}

/** "Sep 28 · 19:00" */
export function formatShortDateTime(iso: string) {
    const d = new Date(iso)
    return `${shortFmt.format(d)} · ${timeFmt.format(d)}`
}

export function plural(n: number, word: string, pluralWord = `${word}s`) {
    return `${n} ${n === 1 ? word : pluralWord}`
}

export const levelLabel: Record<ProficiencyLevel, string> = {
    BEGINNER: "Beginner",
    INTERMEDIATE: "Intermediate",
    ADVANCED: "Advanced",
    EXPERT: "Expert"
}

export const statusLabel: Record<SessionStatus, string> = {
    PENDING: "Pending",
    ONGOING: "Ongoing",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled"
}

/** Nilai default untuk input datetime-local: besok jam 19:00 waktu lokal */
export function defaultSchedule() {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    d.setHours(19, 0, 0, 0)
    return toLocalInput(d)
}

export function toLocalInput(d: Date) {
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
