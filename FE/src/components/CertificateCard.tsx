import { cn } from "../lib/cn"
import { displayName, formatDate } from "../lib/format"

interface CertificateCardProps {
    studentName: string | null
    skillName: string
    issuedAt: string
    certificateNo: string
    teacherName?: string | null
    className?: string
}

/** Kartu "Certificate of Completion" sesuai Figma */
export function CertificateCard({ studentName, skillName, issuedAt, certificateNo, teacherName, className }: CertificateCardProps) {
    return (
        <div
            className={cn(
                "relative overflow-hidden rounded-[14px] border border-cert-line bg-cert px-5 pt-7 pb-6 text-center text-cert-ink shadow-[0_1px_0_rgba(0,0,0,0.04)] sm:px-10",
                className
            )}
        >
            {/* Sudut segitiga sage */}
            <span aria-hidden className="absolute top-0 left-0 h-[60px] w-[90px] bg-cert-corner [clip-path:polygon(0_0,100%_0,0_100%)]" />
            <span
                aria-hidden
                className="absolute right-0 bottom-0 h-[60px] w-[90px] bg-cert-corner [clip-path:polygon(100%_0,100%_100%,0_100%)]"
            />

            <p className="font-display text-[20px] leading-6 font-bold tracking-[-0.03em]">SkillSwapping</p>
            <p className="mt-1 text-[10px] tracking-[0.22em] text-muted uppercase">Learn · Share · Grow</p>

            <h2 className="mt-5 font-serif text-[26px] leading-tight font-medium sm:text-[30px]">Certificate of Completion</h2>
            <p className="mt-3 text-[10px] tracking-[0.2em] text-muted uppercase">This certifies that</p>
            <p className="mx-auto mt-1 inline-block border-b border-cert-corner px-4 pb-1 font-serif text-[26px] leading-tight text-[#4f6446]">
                {displayName(studentName)}
            </p>
            <p className="mt-3 text-[10px] tracking-[0.18em] text-muted uppercase">Has successfully completed the skill swap session</p>
            <p className="mt-1.5 font-serif text-[22px] leading-tight font-semibold">{skillName}</p>
            <p className="mx-auto mt-2 max-w-[470px] text-[12px] leading-[18px] text-muted">
                and has demonstrated dedication and progress in learning and sharing skills through SkillSwap
                {teacherName ? `, mentored by ${displayName(teacherName)}` : ""}.
            </p>

            <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                <div className="text-left">
                    <p className="text-[13px] text-cert-ink">{formatDate(issuedAt)}</p>
                    <p className="mt-0.5 pl-6 text-[9px] tracking-[0.2em] text-muted uppercase">Date</p>
                </div>
                <span
                    aria-hidden
                    className="grid size-[52px] place-items-center rounded-full border-[3px] border-cert-corner bg-seal text-[18px] text-cert"
                >
                    ✿
                </span>
                <div className="relative z-10 text-right">
                    <p className="font-serif text-[13px] text-cert-ink italic">SkillSwapping Team</p>
                    <p className="mt-0.5 text-[9px] tracking-[0.2em] text-muted uppercase">Signature</p>
                </div>
            </div>
            <p className="mt-4 text-[9px] tracking-[0.18em] text-muted/80 uppercase">No. {certificateNo}</p>
        </div>
    )
}
