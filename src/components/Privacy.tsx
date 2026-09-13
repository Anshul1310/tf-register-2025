import { ArrowLeft, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const Privacy = () => {
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
                        <Shield className="w-5 h-5" />
                        <span>TransfiNITTe 2025</span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">Privacy Policy</h1>
                    <p className="text-neutral-400 text-sm">Last updated: September 13, 2026</p>
                </div>

                <div className="space-y-6 text-neutral-300 leading-relaxed text-sm md:text-base">
                    <section className="space-y-2">
                        <h2 className="text-xl font-bold text-white">1. Information We Collect</h2>
                        <p>
                            When you sign in to TransfiNITTe 2025 using your Google account or email, we collect basic profile details:
                        </p>
                        <ul className="list-disc pl-6 space-y-1 text-neutral-400">
                            <li>Your Name and Email Address (from your Google account)</li>
                            <li>Your Profile Avatar URL</li>
                            <li>Hackathon registration details (e.g., college, department, roll number, hostel, team associations)</li>
                        </ul>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-xl font-bold text-white">2. How We Use Your Information</h2>
                        <p>We use your collected information strictly for:</p>
                        <ul className="list-disc pl-6 space-y-1 text-neutral-400">
                            <li>Authenticating your access to your hackathon team and dashboard</li>
                            <li>Managing hackathon registration, domain selection, and team coordination</li>
                            <li>Sending essential hackathon announcements and notifications</li>
                        </ul>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-xl font-bold text-white">3. Data Sharing & Protection</h2>
                        <p>
                            We do not sell, rent, or distribute your personal information to any third parties. Your data is stored securely in encrypted databases and is only accessible by official TransfiNITTe hackathon coordinators for event logistics.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-xl font-bold text-white">4. Google User Data Policy</h2>
                        <p>
                            TransfiNITTe 2025 accesses only the basic Google user profile scopes (`profile` and `email`). We do not request or store any other private data from your Google account.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h2 className="text-xl font-bold text-white">5. Contact Us</h2>
                        <p>
                            If you have any questions or requests regarding your data, please reach out to the technical team at{" "}
                            <a href="mailto:support@transfinitte.com" className="text-yellow-400 underline">
                                support@transfinitte.com
                            </a>.
                        </p>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default Privacy;
