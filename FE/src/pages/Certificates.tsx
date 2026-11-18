import { Link } from "react-router-dom"
import { EmptyCard, ErrorBlock, LoadingBlock } from "../components/Feedback"
import { CenterLayout } from "../components/SplitLayout"
import { useCurrentUser } from "../context/AuthContext"
import { useAsync } from "../hooks/useAsync"
import { api } from "../lib/api"
import { displayName, formatDate } from "../lib/format"

export default function Certificates() {
    const me = useCurrentUser()
    const certs = useAsync(() => api.getUserCertificates(me.id), [me.id])

    return (
        <CenterLayout width={720}>
            <span className="inline-flex h-[27px] items-center gap-1.5 rounded-full bg-forest px-3 text-[12px] font-medium text-mint">
                <span aria-hidden>🏆</span> Achievements
            </span>
            <h1 className="title-xl mt-3">Your Certificates</h1>
            <p className="mt-3 text-[17px] leading-[25px] text-muted">Every completed learning session earns you a certificate.</p>

            <div className="mt-6">
                {certs.error ? (
                    <ErrorBlock error={certs.error} onRetry={certs.reload} />
                ) : certs.loading ? (
                    <LoadingBlock />
                ) : !certs.data?.length ? (
                    <EmptyCard
                        title="No certificates yet"
                        text="Complete a session as a learner to earn your first one."
                        action={
                            <Link to="/browse" className="btn-light">
                                Find a skill →
                            </Link>
                        }
                    />
                ) : (
                    <ul className="grid gap-3 sm:grid-cols-2">
                        {certs.data.map((c) => (
                            <li key={c.id}>
                                <Link
                                    to={`/sessions/${c.sessionId}/certificate`}
                                    className="group relative block overflow-hidden rounded-[14px] border border-cert-line bg-cert p-5 text-cert-ink transition hover:-translate-y-0.5 hover:shadow-md"
                                >
                                    <span
                                        aria-hidden
                                        className="absolute top-0 right-0 h-10 w-[60px] bg-cert-corner [clip-path:polygon(0_0,100%_0,100%_100%)]"
                                    />
                                    <p className="text-[10px] tracking-[0.2em] text-muted uppercase">Certificate of Completion</p>
                                    <p className="mt-2 font-serif text-[22px] leading-tight font-semibold">{c.skillName}</p>
                                    <p className="mt-1 text-[13px] text-muted">
                                        with {displayName(c.teacher.name)} · {formatDate(c.issuedAt)}
                                    </p>
                                    <p className="mt-3 text-[13px] font-medium group-hover:underline">View certificate →</p>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </CenterLayout>
    )
}
