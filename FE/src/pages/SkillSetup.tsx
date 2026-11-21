import { useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { useNavigate } from "react-router-dom"
import { art } from "../assets/illustrations"
import { BackLink } from "../components/BackLink"
import { Chip } from "../components/Chip"
import { ErrorBlock, LoadingBlock, Notice, Spinner } from "../components/Feedback"
import { SplitLayout } from "../components/SplitLayout"
import { Stepper } from "../components/Stepper"
import { useCurrentUser } from "../context/AuthContext"
import { useAsync } from "../hooks/useAsync"
import { api } from "../lib/api"
import { cn } from "../lib/cn"
import { levelLabel } from "../lib/format"
import { tintAt, tintFor } from "../lib/tints"
import type { Category, ProficiencyLevel, Skill, UserSkill } from "../types"

const LEVELS: ProficiencyLevel[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]

/** Glyph monokrom seperti di Figma; fallback ke ikon kategori dari DB */
function categoryGlyph(c: Category) {
    const n = c.name.toLowerCase()
    if (/(ui|ux|design|desain)/.test(n)) return "▭"
    if (/(photo|foto)/.test(n)) return "◉"
    if (/(music|musik)/.test(n)) return "♪"
    if (/(language|bahasa)/.test(n)) return "○"
    if (/marketing/.test(n)) return "▌"
    if (/(program|coding|code)/.test(n)) return "</>"
    return c.icon ?? "•"
}

interface DraftSkill {
    key: string
    name: string
    categoryId: number
    level: ProficiencyLevel
    coins: number
}

export default function SkillSetup() {
    const me = useCurrentUser()
    const navigate = useNavigate()

    const master = useAsync(() => Promise.all([api.getSkills(), api.getCategories()]), [])
    const mine = useAsync(() => api.getUserSkills(me.id), [me.id])

    const skills = master.data?.[0] ?? []
    const categories = master.data?.[1] ?? []

    // Pencarian "What do you want to learn?"
    const [query, setQuery] = useState("")
    const [focused, setFocused] = useState(false)
    const [activeCategory, setActiveCategory] = useState<number | null>(null)
    const [learnDrafts, setLearnDrafts] = useState<DraftSkill[]>([])

    // "What can you teach?"
    const [teachText, setTeachText] = useState("")
    const [teachCategory, setTeachCategory] = useState<number | "">("")
    const [teachLevel, setTeachLevel] = useState<ProficiencyLevel>("INTERMEDIATE")
    const [teachCoins, setTeachCoins] = useState("")
    const [teachDrafts, setTeachDrafts] = useState<DraftSkill[]>([])

    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const searchRef = useRef<HTMLInputElement>(null)

    const savedLearn = (mine.data ?? []).filter((s) => s.type === "LEARNING")
    const savedTeach = (mine.data ?? []).filter((s) => s.type === "OFFERING")

    const takenLearn = useMemo(
        () => new Set([...savedLearn.map((s) => s.skill.name.toLowerCase()), ...learnDrafts.map((d) => d.name.toLowerCase())]),
        [savedLearn, learnDrafts]
    )

    const suggestions = useMemo(() => {
        const q = query.trim().toLowerCase()
        return skills
            .filter((s) => !takenLearn.has(s.name.toLowerCase()))
            .filter((s) => (activeCategory ? s.categoryId === activeCategory : true))
            .filter((s) => (q ? s.name.toLowerCase().includes(q) : true))
            .slice(0, 8)
    }, [skills, query, activeCategory, takenLearn])

    const exactExists = skills.some((s) => s.name.toLowerCase() === query.trim().toLowerCase())
    const showDropdown =
        focused &&
        (query.trim().length > 0 || activeCategory !== null) &&
        (suggestions.length > 0 || (query.trim().length > 0 && !exactExists))

    const addLearn = (skill: Skill) => {
        setLearnDrafts((d) => [
            ...d,
            { key: `s${skill.id}`, name: skill.name, categoryId: skill.categoryId, level: "BEGINNER", coins: 0 }
        ])
        setQuery("")
        setFocused(false)
        setError(null)
    }

    const addCustomLearn = () => {
        const name = query.trim()
        if (!name || takenLearn.has(name.toLowerCase())) return
        if (!activeCategory) {
            setError(`Pilih kategori dulu (Popular skills) untuk skill baru "${name}".`)
            return
        }
        setLearnDrafts((d) => [...d, { key: `c${Date.now()}`, name, categoryId: activeCategory, level: "BEGINNER", coins: 0 }])
        setQuery("")
        setFocused(false)
        setError(null)
    }

    const onSearchKey = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key !== "Enter") return
        e.preventDefault()
        const exact = skills.find((s) => s.name.toLowerCase() === query.trim().toLowerCase())
        if (exact && !takenLearn.has(exact.name.toLowerCase())) addLearn(exact)
        else if (suggestions.length === 1) addLearn(suggestions[0])
        else addCustomLearn()
    }

    /** Ubah teks "What can you teach?" jadi draft (cari kategori dari master skill kalau ada) */
    const buildTeachDraft = (): DraftSkill | null => {
        const name = teachText.trim()
        if (!name) return null
        const known = skills.find((s) => s.name.toLowerCase() === name.toLowerCase())
        const categoryId = teachCategory || known?.categoryId
        if (!categoryId) {
            setError(`Pilih kategori untuk "${name}".`)
            return null
        }
        const already =
            savedTeach.some((s) => s.skill.name.toLowerCase() === name.toLowerCase()) ||
            teachDrafts.some((d) => d.name.toLowerCase() === name.toLowerCase())
        if (already) {
            setError(`"${name}" sudah ada di daftar skill yang kamu ajarkan.`)
            return null
        }
        return {
            key: `t${Date.now()}`,
            name: known?.name ?? name,
            categoryId,
            level: teachLevel,
            coins: Math.max(0, parseInt(teachCoins) || 0)
        }
    }

    const addTeach = (e?: FormEvent) => {
        e?.preventDefault()
        const draft = buildTeachDraft()
        if (!draft) return
        setTeachDrafts((d) => [...d, draft])
        setTeachText("")
        setTeachCoins("")
        setTeachCategory("")
        setError(null)
    }

    const removeSaved = async (us: UserSkill) => {
        try {
            await api.deleteUserSkill(us.id)
            mine.setData((prev) => (prev ?? []).filter((s) => s.id !== us.id))
        } catch (err) {
            setError((err as Error).message)
        }
    }

    const onContinue = async () => {
        setError(null)
        const pendingTeach = [...teachDrafts]
        if (teachText.trim()) {
            const draft = buildTeachDraft()
            if (!draft) return
            pendingTeach.push(draft)
        }

        const total = savedLearn.length + savedTeach.length + learnDrafts.length + pendingTeach.length
        if (total === 0) {
            setError("Tambahkan minimal satu skill yang ingin kamu pelajari atau ajarkan.")
            searchRef.current?.focus()
            return
        }

        setSaving(true)
        try {
            for (const d of learnDrafts) {
                await api.addUserSkill(me.id, {
                    skillName: d.name,
                    categoryId: d.categoryId,
                    type: "LEARNING",
                    proficiencyLevel: "BEGINNER"
                })
            }
            for (const d of pendingTeach) {
                await api.addUserSkill(me.id, {
                    skillName: d.name,
                    categoryId: d.categoryId,
                    type: "OFFERING",
                    proficiencyLevel: d.level,
                    offeredCoins: d.coins
                })
            }
            navigate("/browse")
        } catch (err) {
            setError((err as Error).message)
            // Refresh supaya draft yang sudah tersimpan tidak dikirim ulang
            mine.reload()
            setLearnDrafts([])
            setTeachDrafts([])
        } finally {
            setSaving(false)
        }
    }

    const showTeachDetails = teachText.trim().length > 0

    return (
        <SplitLayout art={art.setup} artAlt="Illustration of a learner drawing in a notebook">
            <BackLink />
            <div className="mt-5">
                <Stepper active={2} />
            </div>

            <h1 className="title-xl mt-7">What do you want to learn?</h1>

            {master.error ? (
                <div className="mt-6">
                    <ErrorBlock error={master.error} onRetry={master.reload} />
                </div>
            ) : master.loading ? (
                <LoadingBlock />
            ) : (
                <>
                    {/* Search */}
                    <div className="relative mt-6">
                        <span aria-hidden className="pointer-events-none absolute top-1/2 left-6 -translate-y-1/2 text-[15px] text-pampas">
                            ⌕
                        </span>
                        <input
                            ref={searchRef}
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value)
                                setFocused(true)
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Escape") setFocused(false)
                                else onSearchKey(e)
                            }}
                            onFocus={() => setFocused(true)}
                            onBlur={() => setTimeout(() => setFocused(false), 150)}
                            placeholder="Search a skill…"
                            aria-label="Search a skill to learn"
                            role="combobox"
                            aria-expanded={showDropdown}
                            aria-controls="skill-suggestions"
                            className="input-dark pl-11.5"
                        />
                        {showDropdown && (
                            <ul
                                id="skill-suggestions"
                                role="listbox"
                                className="absolute inset-x-0 top-[calc(100%+8px)] z-10 max-h-72 overflow-auto rounded-2xl border border-night bg-card p-2 shadow-xl"
                            >
                                {suggestions.map((s) => (
                                    <li key={s.id}>
                                        <button
                                            type="button"
                                            role="option"
                                            aria-selected={false}
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={() => addLearn(s)}
                                            className="flex w-full cursor-pointer items-center justify-between rounded-xl px-4 py-2.5 text-left text-[15px] text-pampas hover:bg-card-2"
                                        >
                                            <span>{s.name}</span>
                                            <span className="text-[12px] text-dim">
                                                {categories.find((c) => c.id === s.categoryId)?.name}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                                {query.trim() && !exactExists && (
                                    <li>
                                        <button
                                            type="button"
                                            onMouseDown={(e) => e.preventDefault()}
                                            onClick={addCustomLearn}
                                            className="w-full cursor-pointer rounded-xl px-4 py-2.5 text-left text-[15px] text-mint hover:bg-card-2"
                                        >
                                            + Add “{query.trim()}”
                                            {activeCategory
                                                ? ` to ${categories.find((c) => c.id === activeCategory)?.name}`
                                                : " (pick a category below)"}
                                        </button>
                                    </li>
                                )}
                            </ul>
                        )}
                    </div>

                    {(savedLearn.length > 0 || learnDrafts.length > 0) && (
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <span className="mr-1 text-[13px] text-muted">You'll learn</span>
                            {savedLearn.map((s) => (
                                <Chip key={s.id} tint={tintFor(s.skill.name)} onRemove={() => removeSaved(s)}>
                                    {s.skill.name}
                                </Chip>
                            ))}
                            {learnDrafts.map((d) => (
                                <Chip
                                    key={d.key}
                                    tint={tintFor(d.name)}
                                    onRemove={() => setLearnDrafts((list) => list.filter((x) => x.key !== d.key))}
                                >
                                    {d.name}
                                </Chip>
                            ))}
                        </div>
                    )}

                    {/* Popular skills = kategori */}
                    <h2 className="title-section mt-7 mb-3">Popular skills</h2>
                    <div className="flex flex-wrap gap-2.5">
                        {categories.map((c, i) => (
                            <Chip
                                key={c.id}
                                tint={tintAt(i)}
                                size="lg"
                                icon={categoryGlyph(c)}
                                active={activeCategory === c.id}
                                onClick={() => {
                                    setActiveCategory((cur) => (cur === c.id ? null : c.id))
                                    searchRef.current?.focus()
                                }}
                            >
                                {c.name}
                            </Chip>
                        ))}
                    </div>

                    {/* What can you teach? */}
                    <h2 className="title-section mt-7 mb-3">What can you teach?</h2>
                    <form onSubmit={addTeach}>
                        <input
                            value={teachText}
                            onChange={(e) => {
                                setTeachText(e.target.value)
                                const known = skills.find((s) => s.name.toLowerCase() === e.target.value.trim().toLowerCase())
                                if (known) setTeachCategory(known.categoryId)
                            }}
                            placeholder="e.g. Flutter"
                            aria-label="A skill you can teach"
                            list="all-skills"
                            className="input-dark"
                        />
                        <datalist id="all-skills">
                            {skills.map((s) => (
                                <option key={s.id} value={s.name} />
                            ))}
                        </datalist>

                        {showTeachDetails && (
                            <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-[1fr_1fr_auto_auto]">
                                <select
                                    value={teachCategory}
                                    onChange={(e) => setTeachCategory(e.target.value ? Number(e.target.value) : "")}
                                    aria-label="Category"
                                    className="h-11 cursor-pointer rounded-full border border-night bg-card px-4 text-[14px] text-pampas outline-none"
                                >
                                    <option value="">Category…</option>
                                    {categories.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={teachLevel}
                                    onChange={(e) => setTeachLevel(e.target.value as ProficiencyLevel)}
                                    aria-label="Your level"
                                    className="h-11 cursor-pointer rounded-full border border-night bg-card px-4 text-[14px] text-pampas outline-none"
                                >
                                    {LEVELS.map((l) => (
                                        <option key={l} value={l}>
                                            {levelLabel[l]}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="number"
                                    min={0}
                                    inputMode="numeric"
                                    value={teachCoins}
                                    onChange={(e) => setTeachCoins(e.target.value)}
                                    placeholder="Coins / session"
                                    aria-label="Price in coins per session (optional)"
                                    className="h-11 w-full rounded-full border border-night bg-card px-4 text-[14px] text-pampas outline-none placeholder:text-[#8b897f] sm:w-37.5"
                                />
                                <button
                                    type="submit"
                                    className="h-11 cursor-pointer rounded-full bg-ink px-5 text-[14px] font-medium text-pampas hover:bg-card-2"
                                >
                                    Add
                                </button>
                            </div>
                        )}
                    </form>

                    {(savedTeach.length > 0 || teachDrafts.length > 0) && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="mr-1 text-[13px] text-muted">You'll teach</span>
                            {savedTeach.map((s) => (
                                <Chip key={s.id} tint={tintFor(s.skill.name)} onRemove={() => removeSaved(s)}>
                                    {s.skill.name}
                                    {s.offeredCoins > 0 && <span className="ml-1 opacity-70">· {s.offeredCoins}c</span>}
                                </Chip>
                            ))}
                            {teachDrafts.map((d) => (
                                <Chip
                                    key={d.key}
                                    tint={tintFor(d.name)}
                                    onRemove={() => setTeachDrafts((list) => list.filter((x) => x.key !== d.key))}
                                >
                                    {d.name}
                                    {d.coins > 0 && <span className="ml-1 opacity-70">· {d.coins}c</span>}
                                </Chip>
                            ))}
                        </div>
                    )}

                    {error && (
                        <Notice tone="error" className="mt-4">
                            {error}
                        </Notice>
                    )}

                    <button type="button" onClick={onContinue} disabled={saving} className={cn("btn-primary mt-3", !error && "mt-3")}>
                        {saving ? <Spinner /> : "Continue →"}
                    </button>
                </>
            )}
        </SplitLayout>
    )
}
