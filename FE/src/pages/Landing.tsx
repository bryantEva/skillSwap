import { Fragment } from "react"
import { Link } from "react-router-dom"
import { art } from "../assets/illustrations"
import { SplitLayout } from "../components/SplitLayout"
import { useAuth } from "../context/AuthContext"

const STEPS = [
    { label: "Learn", glyph: "▤" },
    { label: "Match", image: art.handshake },
    { label: "Swap", glyph: "⇄" },
    { label: "Grow", glyph: "✿" }
]

export default function Landing() {
    const { isAuthenticated } = useAuth()

    return (
        <SplitLayout art={art.landing} artAlt="Illustration of a learner at a laptop" artWidth={660} artOnMobile>
            <div className="flex max-w-[520px] flex-col gap-[11px]">
                <h1 className="font-display text-[44px] leading-[1.02] font-bold tracking-[-0.02em] text-black sm:text-[62px]">
                    Skills that pay with
                    <br />
                    SkillSwap.
                </h1>
                <p className="text-[17px] leading-[25.5px] text-muted">
                    Learn from people. Share what you know.
                    <br />
                    Exchange skills or book a session.
                </p>

                <div className="flex flex-wrap gap-3 pt-[15px]">
                    <Link to="/browse" className="btn-outline">
                        Find a Skill →
                    </Link>
                    <Link to={isAuthenticated ? "/setup" : "/register"} className="btn-outline border-black">
                        Teach a Skill →
                    </Link>
                </div>

                <ol className="mt-[70px] flex items-start gap-1 sm:gap-2" aria-label="How SkillSwap works">
                    {STEPS.map((s, i) => (
                        <Fragment key={s.label}>
                            {i > 0 && (
                                <li aria-hidden className="pt-5 text-[16px] leading-6 text-muted">
                                    →
                                </li>
                            )}
                            <li className="flex w-[72px] flex-col items-center gap-[7.5px] sm:w-[96px]">
                                <span className="grid size-14 place-items-center rounded-full border-4 border-sun-soft bg-sun text-[22px] font-medium text-cod sm:size-16 sm:text-[24px]">
                                    {s.image ? (
                                        <img src={s.image} alt="" className="h-[26px] w-[36px] object-contain sm:h-[30px] sm:w-[42px]" />
                                    ) : (
                                        s.glyph
                                    )}
                                </span>
                                <span className="text-[15px] leading-[22.5px] font-medium text-black">{s.label}</span>
                            </li>
                        </Fragment>
                    ))}
                </ol>
            </div>
        </SplitLayout>
    )
}
