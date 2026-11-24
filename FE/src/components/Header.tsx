import { useEffect, useState } from "react"
import { Link, NavLink, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { cn } from "../lib/cn"
import { Avatar } from "./Avatar"
import { CoinPill } from "./Coin"

const pill = "inline-flex h-10 items-center justify-center rounded-full border border-pampas px-5 text-[14px] font-medium transition-colors"

export function Header() {
    const { user, logout } = useAuth()
    const location = useLocation()
    const [open, setOpen] = useState(false)

    useEffect(() => {
        setOpen(false)
    }, [location.pathname])

    const links = user
        ? [
            { to: "/home", label: "Home" },
            { to: "/browse", label: "Browse" },
            { to: "/sessions", label: "Sessions" },
            { to: "/about", label: "About" }
        ]
        : [
            { to: "/", label: "Home" },
            { to: "/browse", label: "Browse" },
            { to: "/about", label: "About" }
        ]

    const handleLogout = () => {
        logout()
        // Reload penuh ke landing: bersihkan state & hindari redirect ke /login dari RequireAuth
        window.location.assign("/")
    }

    const navLinkClass = ({ isActive }: { isActive: boolean }) =>
        cn(
            "border-b-2 py-1 text-[14px] leading-[21px] transition-colors",
            isActive ? "border-black" : "border-transparent hover:border-black/25"
        )

    return (
        <header className="relative z-20 h-[77px] w-full">
            <div className="flex h-full items-center justify-between px-5 sm:px-[51px]">
                <Link
                    to={user ? "/home" : "/"}
                    className="px-1.5 font-display text-[26px] leading-[39px] font-bold tracking-[-0.04em] text-[#1b1818]"
                >
                    skillswapping
                </Link>

                {/* Desktop */}
                <div className="hidden items-center gap-[22px] md:flex">
                    {links.map((l) => (
                        <NavLink key={l.to} to={l.to} end={l.to === "/"} className={navLinkClass}>
                            {l.label}
                        </NavLink>
                    ))}

                    {user ? (
                        <>
                            <CoinPill coins={user.coins} to="/wallet" />
                            <Link to="/profile" aria-label="My profile" className="rounded-full transition hover:opacity-85">
                                <Avatar src={user.avatarUrl} name={user.name} size={40} tone="sage" />
                            </Link>
                            <button type="button" onClick={handleLogout} className={cn(pill, "cursor-pointer hover:bg-pampas")}>
                                Log out
                            </button>
                        </>
                    ) : (
                        <>
                            <Link to="/login" className={cn(pill, "hover:bg-pampas")}>
                                Log in
                            </Link>
                            <Link to="/register" className={cn(pill, "bg-pampas text-ink hover:bg-pampas-deep")}>
                                Sign up
                            </Link>
                        </>
                    )}
                </div>

                {/* Mobile toggle */}
                <button
                    type="button"
                    onClick={() => setOpen((o) => !o)}
                    className={cn(pill, "cursor-pointer gap-2 px-4 md:hidden", open && "bg-pampas")}
                    aria-expanded={open}
                    aria-controls="mobile-menu"
                >
                    {open ? "Close" : "Menu"}
                </button>
            </div>

            {open && (
                <div
                    id="mobile-menu"
                    className="absolute inset-x-0 top-[77px] border-y border-pampas-deep bg-cream px-5 pt-2 pb-5 shadow-[0_12px_24px_-16px_rgba(0,0,0,0.25)] md:hidden"
                >
                    <nav className="flex flex-col">
                        {links.map((l) => (
                            <NavLink
                                key={l.to}
                                to={l.to}
                                end={l.to === "/"}
                                className={({ isActive }) =>
                                    cn("border-b border-pampas py-3 text-[16px]", isActive && "font-semibold")
                                }
                            >
                                {l.label}
                            </NavLink>
                        ))}
                        {user && (
                            <>
                                <NavLink to="/profile" className="border-b border-pampas py-3 text-[16px]">
                                    My profile
                                </NavLink>
                                <NavLink to="/wallet" className="border-b border-pampas py-3 text-[16px]">
                                    Coins · {user.coins}
                                </NavLink>
                            </>
                        )}
                    </nav>
                    <div className="mt-4 flex gap-3">
                        {user ? (
                            <button type="button" onClick={handleLogout} className={cn(pill, "w-full cursor-pointer")}>
                                Log out
                            </button>
                        ) : (
                            <>
                                <Link to="/login" className={cn(pill, "flex-1")}>
                                    Log in
                                </Link>
                                <Link to="/register" className={cn(pill, "flex-1 bg-pampas")}>
                                    Sign up
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </header>
    )
}
