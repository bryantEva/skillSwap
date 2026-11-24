import { Link } from "react-router-dom"
import { art } from "../assets/illustrations"
import { SplitLayout } from "../components/SplitLayout"
import { useAuth } from "../context/AuthContext"
import { cn } from "../lib/cn"
import { tintBg, type Tint } from "../lib/tints"

const POINTS: Array<{ glyph: string; tint: Tint; title: string; text: string }> = [
    { glyph: "▤", tint: "navy", title: "Learn", text: "Tell us what you want to learn and what you can teach." },
    { glyph: "⟳", tint: "forest", title: "Match", text: "We match you with people whose skills fit yours." },
    { glyph: "⇄", tint: "olive", title: "Swap", text: "Trade a session for a session, or pay with coins held safely in escrow." },
    { glyph: "✿", tint: "plum", title: "Grow", text: "Finish a session, leave a review and collect your certificate." }
]

export default function About() {
    const { isAuthenticated } = useAuth()
    return (
        <SplitLayout art={art.profile} artAlt="Illustration of a learner reading" artWidth={580}>
            <h1 className="title-xl">Small steps. Big growth.</h1>
            <p className="mt-3 text-[17px] leading-[25.5px] text-muted">
                SkillSwapping is a place to learn from people and share what you know. No money needed: swap skills one-for-one, or
                use coins you earn by teaching and daily check-ins.
            </p>

            <ul className="mt-7 flex flex-col gap-2.5">
                {POINTS.map((p) => (
                    <li key={p.title} className="card-dark flex items-center gap-3.5 p-4">
                        <span className={cn("grid size-11 shrink-0 place-items-center rounded-full text-[17px] text-pampas", tintBg[p.tint])}>
                            {p.glyph}
                        </span>
                        <div>
                            <p className="font-display text-[16px] font-semibold">{p.title}</p>
                            <p className="text-[14px] text-dim">{p.text}</p>
                        </div>
                    </li>
                ))}
            </ul>

            <Link to={isAuthenticated ? "/browse" : "/register"} className="btn-primary mt-6">
                {isAuthenticated ? "Find a skill →" : "Join SkillSwapping →"}
            </Link>
        </SplitLayout>
    )
}
