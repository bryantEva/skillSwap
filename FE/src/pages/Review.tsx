import { useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { art } from "../assets/illustrations"
import { Avatar } from "../components/Avatar"
import { BackLink } from "../components/BackLink"
import { ErrorBlock, LoadingBlock, Notice, Spinner } from "../components/Feedback"
import { SplitLayout } from "../components/SplitLayout"
import { useCurrentUser } from "../context/AuthContext"
import { useAsync } from "../hooks/useAsync"
import { api } from "../lib/api"
import { cn } from "../lib/cn"
import { displayName, plural, statusLabel } from "../lib/format"
import { tintBg, tintFor } from "../lib/tints"

const STAR_LABELS = ["Poor", "Fair", "Good", "Great", "Excellent"]

export default function Review() {
    const me = useCurrentUser()
    const navigate = useNavigate()
    const sessionId = Number(useParams().sessionId)

    const data = useAsync(() => Promise.all([api.getSession(sessionId), api.getSessions(me.id)]), [sessionId, me.id])
    const session = data.data?.[0]
    const all = data.data?.[1] ?? []

    const [stars, setStars] = useState(5)
    const [hover, setHover] = useState<number | null>(null)
    const [comment, setComment] = useState("")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const isStudent = session?.studentId === me.id
    const other = session ? (isStudent ? session.teacher : session.student) : null
    const alreadyRated = session?.ratings.some((r) => r.reviewerId === me.id)
    const completedTogether = session
        ? all.filter(
              (s) =>
                  s.status === "COMPLETED" &&
                  s.skill.id === session.skill.id &&
                  (s.teacherId === other?.id || s.studentId === other?.id)
          ).length || 1
        : 0

    const submit = async () => {
        if (!session || !other) return
        setBusy(true)
        setError(null)
        try {
            await api.addRating(session.id, { stars, comment: comment.trim() || undefined, revieweeId: other.id })
            if (isStudent && session.certificate) navigate(`/sessions/${session.id}/certificate`)
            else navigate("/sessions", { state: { flash: "Terima kasih! Review kamu sudah terkirim." } })
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setBusy(false)
        }
    }

    const shown = hover ?? stars

    return (
        <SplitLayout art={art.review} artAlt="Illustration of a learner knitting a scarf">
            <BackLink fallback="/sessions" />

            {data.error ? (
                <div className="mt-6">
                    <ErrorBlock error={data.error} onRetry={data.reload} />
                </div>
            ) : data.loading || !session || !other ? (
                <LoadingBlock />
            ) : session.status !== "COMPLETED" ? (
                <div className="mt-6">
                    <h1 className="title-xl">Not finished yet</h1>
                    <p className="mt-3 text-[17px] text-muted">
                        This {session.skill.name} session is still <b>{statusLabel[session.status].toLowerCase()}</b>. You can leave a
                        review once it's completed.
                    </p>
                    <Link to="/sessions" className="btn-primary mt-6">
                        Go to my sessions →
                    </Link>
                </div>
            ) : (
                <>
                    <span className="mt-6 grid size-16 place-items-center rounded-full bg-forest text-[30px] text-mint" aria-hidden>
                        ✓
                    </span>
                    <h1 className="title-xl mt-4">Session completed</h1>
                    <p className="mt-3 text-[17px] leading-[27px] text-muted">
                        {session.skill.name}
                        <br />
                        You completed {completedTogether > 1 ? `all ${completedTogether} sessions` : "your session"} with{" "}
                        {displayName(other.name)}.
                    </p>

                    <div className="card-dark mt-5 flex items-center gap-3.5 p-[17px]">
                        <span
                            className={cn(
                                "grid size-[52px] shrink-0 place-items-center rounded-xl text-[20px] text-pampas",
                                tintBg[tintFor(session.skill.name)]
                            )}
                        >
                            ✎
                        </span>
                        <div className="min-w-0 flex-1">
                            <p className="truncate font-display text-[16px] font-semibold">{session.skill.name}</p>
                            <p className="text-[14px] text-dim">
                                {plural(completedTogether, isStudent ? "Learning Session" : "Teaching Session")}
                            </p>
                        </div>
                        <Avatar src={other.avatarUrl} name={other.name} size={44} />
                        <div className="min-w-0">
                            <p className="truncate font-display text-[16px] font-semibold">{displayName(other.name)}</p>
                            <p className="text-[14px] text-dim">{isStudent ? "Mentor" : "Student"}</p>
                        </div>
                    </div>

                    {alreadyRated ? (
                        <div className="mt-6 flex flex-col gap-4">
                            <Notice tone="success">You already reviewed this session. Thanks for the feedback!</Notice>
                            {isStudent && session.certificate ? (
                                <Link to={`/sessions/${session.id}/certificate`} className="btn-primary">
                                    View certificate →
                                </Link>
                            ) : (
                                <Link to="/home" className="btn-primary">
                                    Back to home →
                                </Link>
                            )}
                        </div>
                    ) : (
                        <>
                            <h2 className="mt-6 text-center font-display text-[18px] font-semibold tracking-[-0.02em] text-card-2">
                                Rate your experience
                            </h2>
                            <div
                                className="mt-2 flex justify-center gap-1"
                                role="radiogroup"
                                aria-label="Rating"
                                onMouseLeave={() => setHover(null)}
                            >
                                {[1, 2, 3, 4, 5].map((n) => (
                                    <button
                                        key={n}
                                        type="button"
                                        role="radio"
                                        aria-checked={stars === n}
                                        aria-label={`${n} star${n > 1 ? "s" : ""} – ${STAR_LABELS[n - 1]}`}
                                        onClick={() => setStars(n)}
                                        onMouseEnter={() => setHover(n)}
                                        className={cn(
                                            "cursor-pointer px-2 text-[34px] leading-none transition-transform hover:scale-110",
                                            n <= shown ? "text-star" : "text-[#d9d5c7]"
                                        )}
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>
                            <p className="mt-1 text-center text-[13px] text-muted">{STAR_LABELS[shown - 1]}</p>

                            <label className="mt-4 block">
                                <span className="mb-1.5 block text-[13px] text-muted">How was your experience?</span>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Share your thoughts…"
                                    rows={3}
                                    maxLength={1000}
                                    className="block min-h-24 w-full resize-y rounded-[14px] border border-night bg-card px-4 py-3 text-[15px] text-pampas outline-none placeholder:text-[#8b897f] focus:border-muted"
                                />
                            </label>

                            {error && (
                                <Notice tone="error" className="mt-4">
                                    {error}
                                </Notice>
                            )}

                            <button type="button" onClick={submit} disabled={busy} className="btn-primary mt-5">
                                {busy ? <Spinner /> : "Submit Review →"}
                            </button>
                        </>
                    )}
                </>
            )}
        </SplitLayout>
    )
}
