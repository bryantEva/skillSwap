import { Link } from "react-router-dom"
import { art } from "../assets/illustrations"
import { SplitLayout } from "../components/SplitLayout"

export default function NotFound() {
    return (
        <SplitLayout art={art.review} artAlt="">
            <h1 className="title-xl">Page not found.</h1>
            <p className="mt-3 text-[17px] text-muted">The page you're looking for doesn't exist or has moved.</p>
            <Link to="/" className="btn-primary mt-6">
                Back to SkillSwap →
            </Link>
        </SplitLayout>
    )
}
