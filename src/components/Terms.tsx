import { ArrowLeft, FileText } from "lucide-react";
import { Link } from "react-router-dom";

const Terms = () => {
    return (
        <div className="flex flex-col min-h-screen bg-black text-white">
            <nav className="flex justify-between items-center p-4 md:p-6 border-b border-neutral-800">
                <Link to="/" className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm font-medium">Back to Home</span>
                </Link>
                <img src="/motif-desk2.svg" alt="Logo" style={{ width: "120px", aspectRatio: "155 / 20" }} />
            </nav>

            <main className="flex-grow max-w-4xl mx-auto px-6 py-12 space-y-8">
                <div className="space-y-2 border-b border-neutral-800 pb-6">
                    <div className="flex items-center gap-2 text-yellow-400 font-semibold text-sm">
                        <FileText className="w-5 h-5" />
                        <span>TransfiNITTe 2025</span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">Terms of Service</h1>
                    <p className="text-neutral-400 text-sm">Last updated: September 13, 2026</p>
                </div>

                <div className="space-y-6 text-neutral-300 leading-relaxed text-sm md:text-base">
                    <section className="space-y-2">
                        <h2 className="text-xl font-bold text-white">1. Acceptance of Terms</h2>
                        <p>
                            By registering and signing into TransfiNITTe 2025, you agree to comply with all hackathon rules, code of conduct, and guidelines set forth by the organizing team.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-xl font-bold text-white">2. Team Participation</h2>
                        <p>
                            Participants must form teams adhering to the team size limits and hackathon domains. All submissions must be original work created during the event.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-xl font-bold text-white">3. Code of Conduct</h2>
                        <p>
                            Harassment, unfair competition, or disruptive behavior of any form will result in immediate disqualification and removal from the platform.
                        </p>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default Terms;
