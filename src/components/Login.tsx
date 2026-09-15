import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { ArrowUpRight, Loader2, ShieldCheck, Lock } from "lucide-react";
import { auth } from "@/utiils/auth";
import { apiClient } from "@/utiils/api";
import { toast } from "sonner";

const dauthClientId = import.meta.env.VITE_DAUTH_CLIENT_ID || "";
const dauthRedirectUri =
    import.meta.env.VITE_DAUTH_REDIRECT_URI ||
    (typeof window !== "undefined" ? `${window.location.origin}/login` : "");

const Login = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

    // Handle DAuth OAuth callback (?code=...)
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const code = searchParams.get("code");
        const error = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");

        if (error) {
            toast.error(`DAuth Error: ${errorDescription || error}`);
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
        }

        if (code) {
            const processDAuthCallback = async () => {
                setIsLoading(true);
                setLoadingMessage("Authenticating with DAuth...");
                try {
                    const redirectUri = dauthRedirectUri || `${window.location.origin}/login`;
                    const res = await apiClient.loginWithDAuth({
                        code,
                        redirect_uri: redirectUri,
                    });

                    if (res.success && res.data) {
                        const userData = res.data;
                        auth.signInWithDAuth(
                            {
                                id: userData.user_id,
                                email: userData.email,
                                name: userData.name,
                                pfp: userData.pfp,
                                gender: userData.gender,
                                roll_number: userData.roll_number,
                            },
                            res.token
                        );
                        toast.success(`Welcome, ${userData.name || userData.email}!`);
                        window.location.href = "/";
                    } else {
                        toast.error(res.message || "Failed to authenticate with DAuth.");
                        window.history.replaceState({}, document.title, window.location.pathname);
                    }
                } catch (err: any) {
                    console.error("DAuth callback error:", err);
                    toast.error(err.message || "Failed to process DAuth login.");
                    window.history.replaceState({}, document.title, window.location.pathname);
                } finally {
                    setIsLoading(false);
                    setLoadingMessage(null);
                }
            };

            processDAuthCallback();
        }
    }, []);

    const handleDAuthLogin = () => {
        if (!dauthClientId) {
            toast.error("DAuth Client ID is not configured. Please set VITE_DAUTH_CLIENT_ID in your environment.");
            return;
        }

        setIsLoading(true);
        setLoadingMessage("Redirecting to DAuth...");

        const redirectUri = dauthRedirectUri || `${window.location.origin}/login`;
        const state = Math.random().toString(36).substring(2, 15);
        const dauthUrl = `https://auth.delta.nitt.edu/authorize?client_id=${encodeURIComponent(
            dauthClientId
        )}&redirect_uri=${encodeURIComponent(
            redirectUri
        )}&response_type=code&grant_type=authorization_code&state=${state}&scope=email+openid+profile+user`;

        window.location.href = dauthUrl;
    };

    return (
        <div className="flex flex-col min-h-screen bg-black text-white selection:bg-emerald-500 selection:text-black">
            {/* Top Navigation */}
            <nav className="flex justify-between items-center p-4 md:p-6 border-b border-neutral-800/80 bg-black/60 backdrop-blur-md sticky top-0 z-50">
                <img src="/motif-desk2.svg" alt="Logo" style={{ width: "40px", aspectRatio: "63 / 29" }} className="md:hidden block" />
                <img src="/motif-desk2.svg" alt="Logo" style={{ width: "120px", aspectRatio: "155 / 20" }} className="md:block hidden" />
                <a
                    href="/"
                    className="text-xs md:text-sm text-neutral-400 hover:text-white transition-colors"
                >
                    Back to Home
                </a>
            </nav>

            {/* Main Login Area */}
            <main className="flex-grow flex flex-col justify-center items-center px-4 md:px-6 py-16 relative overflow-hidden">
                {/* Subtle Background Glow */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 blur-[130px] rounded-full pointer-events-none -z-10" />

                <div className="w-full max-w-md space-y-8 text-center bg-[#0d0d0d] p-8 md:p-10 rounded-3xl border border-neutral-800 shadow-2xl shadow-black/80 relative">
                    <div className="space-y-3">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Delta Auth SSO</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
                            Login to Account
                        </h2>
                        <p className="text-sm md:text-base text-neutral-400 max-w-sm mx-auto">
                            Sign in securely with your official NITT DAuth credentials to participate in TransfiNITTe 2025.
                        </p>
                    </div>

                    <div className="space-y-4 pt-2">
                        <Button
                            type="button"
                            onClick={handleDAuthLogin}
                            disabled={isLoading}
                            className="w-full py-6 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-3 shadow-lg shadow-emerald-950/40 border border-emerald-400/20 text-base group disabled:opacity-60"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>{loadingMessage || "Authenticating..."}</span>
                                </>
                            ) : (
                                <>
                                    <span className="bg-white/20 p-1.5 rounded-lg flex items-center justify-center">
                                        <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
                                            <path d="M12 2L2 22h20L12 2zm0 4.5l6.5 13H5.5L12 6.5z" />
                                        </svg>
                                    </span>
                                    <span>Continue with DAuth</span>
                                    <ArrowUpRight className="h-5 w-5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                </>
                            )}
                        </Button>
                    </div>

                    <div className="pt-4 border-t border-neutral-800/80 flex items-center justify-center gap-2 text-xs text-neutral-500">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Protected by Delta Force OAuth 2.0</span>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Login;