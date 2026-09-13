import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ArrowUpRight, Loader2, Sparkles } from "lucide-react";
import { GoogleOAuthProvider, GoogleLogin } from "@react-oauth/google";
import { auth, generateDeterministicUUID } from "@/utiils/auth";
import { apiClient } from "@/utiils/api";
import { toast } from "sonner";

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

const Login = () => {
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showQuickLogin, setShowQuickLogin] = useState(!googleClientId);

    const handleGoogleSuccess = async (credentialResponse: any) => {
        if (!credentialResponse.credential) {
            toast.error("Google sign in failed: no credential received");
            return;
        }

        setIsLoading(true);
        try {
            const user = auth.signInWithGoogleCredential(credentialResponse.credential);
            const syncRes = await apiClient.syncUser({
                user_id: user.id,
                email: user.email,
                name: user.user_metadata?.full_name,
                pfp: user.user_metadata?.avatar_url,
            });

            if (syncRes.success) {
                toast.success(`Welcome, ${user.user_metadata?.full_name || user.email}!`);
                window.location.href = "/";
            } else {
                toast.error("Failed to sync profile: " + (syncRes.message || "Unknown error"));
            }
        } catch (err) {
            console.error("Login error:", err);
            toast.error("Failed to log in with Google.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleQuickLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !name.trim()) {
            toast.error("Please enter your name and email.");
            return;
        }

        setIsLoading(true);
        try {
            const userId = generateDeterministicUUID(email.trim().toLowerCase());
            const user = {
                id: userId,
                email: email.trim().toLowerCase(),
                user_metadata: {
                    full_name: name.trim(),
                    name: name.trim(),
                    avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}`,
                    picture: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name.trim())}`,
                },
            };

            auth.signIn(user);
            const syncRes = await apiClient.syncUser({
                user_id: user.id,
                email: user.email,
                name: user.user_metadata.full_name,
                pfp: user.user_metadata.avatar_url,
            });

            if (syncRes.success) {
                toast.success(`Welcome, ${name}!`);
                window.location.href = "/";
            } else {
                toast.error("Sync error: " + (syncRes.message || "Failed to initialize user"));
            }
        } catch (err) {
            console.error("Sign in error:", err);
            toast.error("Error signing in.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-black text-white">
            <nav className="flex justify-between items-center p-4 md:p-6 border-b-[1px] border-neutral-800">
                <img src="/motif-desk2.svg" alt="Logo" style={{ width: "40px", aspectRatio: "63 / 29" }} className="md:hidden block" />
                <img src="/motif-desk2.svg" alt="Logo" style={{ width: "120px", aspectRatio: "155 / 20" }} className="md:block hidden" />
            </nav>

            <main className="flex-grow flex flex-col justify-center items-center px-4 md:px-6">
                <div className="w-full max-w-md space-y-6 text-center bg-[#111] p-8 rounded-2xl border border-neutral-800 shadow-2xl">
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Login to your account</h2>
                    <p className="text-sm md:text-base text-gray-400">
                        Sign in to participate in TransfiNITTe 2025 Hackathon.
                    </p>

                    {googleClientId ? (
                        <div className="space-y-4 pt-2">
                            <GoogleOAuthProvider clientId={googleClientId}>
                                <div className="flex justify-center">
                                    <GoogleLogin
                                        onSuccess={handleGoogleSuccess}
                                        onError={() => toast.error("Google Sign-In failed")}
                                        theme="filled_black"
                                        size="large"
                                        shape="pill"
                                        width="100%"
                                    />
                                </div>
                            </GoogleOAuthProvider>

                            <div className="relative my-4">
                                <div className="absolute inset-0 flex items-center">
                                    <span className="w-full border-t border-neutral-800" />
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-[#111] px-2 text-neutral-500">Or use email</span>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {(!googleClientId || showQuickLogin) && (
                        <form onSubmit={handleQuickLogin} className="space-y-3 text-left">
                            <div>
                                <label className="text-xs text-neutral-400 font-medium">Full Name</label>
                                <Input
                                    type="text"
                                    placeholder="John Doe"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="bg-neutral-900 border-neutral-700 text-white rounded-lg mt-1"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs text-neutral-400 font-medium">Email Address</label>
                                <Input
                                    type="email"
                                    placeholder="johndoe@gmail.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-neutral-900 border-neutral-700 text-white rounded-lg mt-1"
                                    required
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full py-3 bg-white text-black rounded-lg font-bold hover:bg-gray-200 transition duration-300 flex items-center justify-center gap-2 mt-4"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Signing in...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Continue</span>
                                        <ArrowUpRight className="h-5 w-5" />
                                    </>
                                )}
                            </Button>
                        </form>
                    )}

                    {googleClientId && !showQuickLogin && (
                        <button
                            type="button"
                            onClick={() => setShowQuickLogin(true)}
                            className="text-xs text-neutral-400 hover:text-white flex items-center justify-center gap-1 mx-auto pt-2"
                        >
                            <Sparkles className="w-3 h-3 text-yellow-400" /> Direct sign-in without Google
                        </button>
                    )}
                </div>
            </main>
        </div>
    );
};

export default Login;