import { useEffect } from "react"
import { Navigate, Route, Routes, useLocation } from "react-router-dom"
import { Header } from "./components/Header"
import { GuestOnly, RequireAuth } from "./components/RequireAuth"
import Landing from "./pages/Landing"
import { Login, Register } from "./pages/Auth"
import Home from "./pages/Home"
import SkillSetup from "./pages/SkillSetup"
import Matches from "./pages/Matches"
import Profile from "./pages/Profile"
import CreateSwap from "./pages/CreateSwap"
import Review from "./pages/Review"
import CertificatePage from "./pages/Certificate"
import Sessions from "./pages/Sessions"
import Certificates from "./pages/Certificates"
import Wallet from "./pages/Wallet"
import About from "./pages/About"
import NotFound from "./pages/NotFound"

function ScrollToTop() {
    const { pathname } = useLocation()
    useEffect(() => {
        // Di Chromium baru scrollTo mengembalikan Promise, jadi jangan di-return dari effect
        window.scrollTo(0, 0)
    }, [pathname])
    return null
}

const guard = (el: React.ReactNode) => <RequireAuth>{el}</RequireAuth>

export default function App() {
    return (
        <div className="min-h-svh bg-cream">
            <ScrollToTop />
            <Header />
            <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/about" element={<About />} />
                <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
                <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />

                <Route path="/home" element={guard(<Home />)} />
                <Route path="/setup" element={guard(<SkillSetup />)} />
                <Route path="/browse" element={guard(<Matches />)} />
                <Route path="/matches" element={<Navigate to="/browse" replace />} />
                <Route path="/profile" element={guard(<Profile />)} />
                <Route path="/users/:userId" element={guard(<Profile />)} />
                <Route path="/swap/new" element={guard(<CreateSwap />)} />
                <Route path="/sessions" element={guard(<Sessions />)} />
                <Route path="/sessions/:sessionId/review" element={guard(<Review />)} />
                <Route path="/sessions/:sessionId/certificate" element={guard(<CertificatePage />)} />
                <Route path="/certificates" element={guard(<Certificates />)} />
                <Route path="/wallet" element={guard(<Wallet />)} />

                <Route path="*" element={<NotFound />} />
            </Routes>
        </div>
    )
}
