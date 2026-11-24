import { useState, type FormEvent } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { art } from "../assets/illustrations"
import { Notice, Spinner } from "../components/Feedback"
import { SplitLayout } from "../components/SplitLayout"
import { useAuth } from "../context/AuthContext"

function Field({
    label,
    ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
    return (
        <label className="block">
            <span className="label">{label}</span>
            <input {...props} className="input-dark" />
        </label>
    )
}

export function Login() {
    const { login } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const from = (location.state as { from?: string } | null)?.from ?? "/home"

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    const submit = async (e: FormEvent) => {
        e.preventDefault()
        setBusy(true)
        setError(null)
        try {
            await login(email.trim(), password)
            navigate(from, { replace: true })
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setBusy(false)
        }
    }

    return (
        <SplitLayout art={art.profile} artAlt="Illustration of a learner reading" artWidth={580}>
            <h1 className="title-xl">Welcome back.</h1>
            <p className="mt-3 text-[17px] leading-[25.5px] text-muted">Log in to keep learning and swapping skills.</p>

            <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
                <Field
                    label="Email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                />
                <Field
                    label="Password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                />
                {error && <Notice tone="error">{error}</Notice>}
                <button type="submit" className="btn-primary mt-1" disabled={busy}>
                    {busy ? <Spinner /> : "Log in →"}
                </button>
            </form>

            <p className="mt-6 text-[15px] text-muted">
                New to SkillSwap?{" "}
                <Link to="/register" state={location.state} className="font-medium text-ink underline">
                    Create an account
                </Link>
            </p>
        </SplitLayout>
    )
}

export function Register() {
    const { register } = useAuth()
    const navigate = useNavigate()

    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState<string | null>(null)
    const [busy, setBusy] = useState(false)

    const submit = async (e: FormEvent) => {
        e.preventDefault()
        if (password.length < 6) {
            setError("Password minimal 6 karakter.")
            return
        }
        setBusy(true)
        setError(null)
        try {
            await register(name.trim(), email.trim(), password)
            // User baru → langsung isi skill
            navigate("/setup", { replace: true })
        } catch (err) {
            setError((err as Error).message)
        } finally {
            setBusy(false)
        }
    }

    return (
        <SplitLayout art={art.setup} artAlt="Illustration of a learner sketching ideas">
            <h1 className="title-xl">Join SkillSwapping.</h1>
            <p className="mt-3 text-[17px] leading-[25.5px] text-muted">
                Learn from people. Share what you know.
            </p>

            <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
                <Field
                    label="Name"
                    autoComplete="name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="What should people call you?"
                />
                <Field
                    label="Email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                />
                <Field
                    label="Password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                />
                {error && <Notice tone="error">{error}</Notice>}
                <button type="submit" className="btn-primary mt-1" disabled={busy}>
                    {busy ? <Spinner /> : "Sign up →"}
                </button>
            </form>

            <p className="mt-6 text-[15px] text-muted">
                Already have an account?{" "}
                <Link to="/login" className="font-medium text-ink underline">
                    Log in
                </Link>
            </p>
        </SplitLayout>
    )
}
