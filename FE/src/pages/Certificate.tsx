import { Link, useParams } from "react-router-dom"
import { BackLink } from "../components/BackLink"
import { CertificateCard } from "../components/CertificateCard"
import { ErrorBlock, LoadingBlock } from "../components/Feedback"
import { CenterLayout } from "../components/SplitLayout"
import { useCurrentUser } from "../context/AuthContext"
import { useAsync } from "../hooks/useAsync"
import { api } from "../lib/api"
import { firstName } from "../lib/format"

export default function CertificatePage() {
    const me = useCurrentUser()
    const sessionId = Number(useParams().sessionId)
    const cert = useAsync(() => api.getCertificate(sessionId), [sessionId])
    const c = cert.data
    const isMine = c?.studentId === me.id

    return (
        <CenterLayout width={556} className="lg:pt-24">
            <div className="flex items-center gap-3">
                <BackLink fallback="/certificates" className="opacity-60" />
                <span className="inline-flex h-[27px] items-center gap-1.5 rounded-full bg-forest px-3 text-[12px] font-medium text-mint">
                    <span aria-hidden>🏆</span> Session Complete
                </span>
            </div>

            <h1 className="title-xl mt-3">Your Certificate</h1>

            {cert.error ? (
                <div className="mt-6">
                    <ErrorBlock error={cert.error} onRetry={cert.reload} />
                    <Link to="/certificates" className="btn-primary mt-4">
                        See all certificates →
                    </Link>
                </div>
            ) : cert.loading || !c ? (
                <LoadingBlock />
            ) : (
                <>
                    <p className="mt-3 text-[17px] leading-[27px] text-muted">
                        {isMine
                            ? `Great job, ${firstName(c.student.name, "friend")}! You've completed a learning session and gained a new skill.`
                            : `${firstName(c.student.name, "Your student")} completed a session with you and earned this certificate.`}
                    </p>

                    <div className="print-area mt-5">
                        <CertificateCard
                            studentName={c.student.name}
                            skillName={c.skillName}
                            issuedAt={c.issuedAt}
                            certificateNo={c.certificateNo}
                            teacherName={c.teacher.name}
                        />
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="inline-flex h-[52px] cursor-pointer items-center rounded-full bg-pampas px-7 text-[16px] font-medium hover:bg-pampas-deep"
                        >
                            Download Certificate
                        </button>
                        <Link
                            to="/home"
                            className="inline-flex h-[52px] items-center rounded-full bg-pampas px-7 text-[16px] font-medium hover:bg-pampas-deep"
                        >
                            View My Learning
                        </Link>
                    </div>
                    <p className="mt-3 text-[13px] text-muted">Tip: pilih “Save as PDF” di dialog print untuk menyimpan sertifikat.</p>
                </>
            )}
        </CenterLayout>
    )
}
