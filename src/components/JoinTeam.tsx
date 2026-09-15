import React, { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { ArrowUpRight, Loader2, Users, Phone, Tag } from "lucide-react";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp";
import { auth } from "@/utiils/auth";
import { apiClient } from "@/utiils/api";
import NavBar from "./Navbar";
import { toast } from "sonner";

interface PublicTeamItem {
    team_id: string;
    team_name: string;
    contact: string;
    domain: string;
}

const JoinTeam = () => {
    const [click, setClick] = useState<boolean>(false);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const [teamCode, setTeamCode] = useState<string>("");
    const [userName, setUsername] = useState<string | undefined>(undefined);
    const [popUp, setPopUp] = useState<boolean>(false);
    const [isJoining, setIsJoining] = useState<boolean>(false);
    const [selectedDomain, setSelectedDomain] = useState<string>("all");
    const [allTeams, setAllTeams] = useState<Array<PublicTeamItem>>([]);
    const [publicTeams, setPublicTeams] = useState<Array<PublicTeamItem>>([]);
    const [domains, setDomains] = useState<Array<string>>([]);

    useEffect(() => {
        const fetchUserAndTeams = async () => {
            try {
                const {
                    data: { user },
                } = await auth.getUser();
                if (!user) {
                    window.location.href = "/login";
                    return;
                }
                const userResponse = await apiClient.getUserById(user.id);
                if (userResponse.success && userResponse.data) {
                    const userData = userResponse.data;
                    const isProfileComplete = Boolean(userData.hostel && userData.mess && userData.roll_number);
                    if (!isProfileComplete) {
                        toast.error("Please complete your profile before joining a team.");
                        window.location.href = "/profile";
                        return;
                    }
                    if (userData.team_id) {
                        toast.info("You are already part of a team.");
                        window.location.href = `/team/${userData.team_id}`;
                        return;
                    }
                    setUsername(userData.name);
                } else {
                    window.location.href = "/login";
                    return;
                }

                const publicTeamsResponse = await apiClient.getPublicTeams();
                if (publicTeamsResponse.success && publicTeamsResponse.data) {
                    const formattedTeams = publicTeamsResponse.data.map((team: any) => ({
                        team_id: team.team_id || team.id || "",
                        team_name: team.name || team.team_name || "Unnamed Team",
                        contact: team.contact || "N/A",
                        domain: team.domain || "Unassigned",
                    }));
                    setPublicTeams(formattedTeams);
                    setAllTeams(formattedTeams);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
                window.location.href = "/login";
            }
        };
        fetchUserAndTeams();
        setDomains(["software", "hardware", "entrepreneurship", "management"]);
    }, []);

    const handleInputChange = (value: string) => {
        setTeamCode(value);
    };

    const handleJoinWithCode = async (codeToJoin: string) => {
        if (!codeToJoin.trim()) {
            toast.error("Team code is required.");
            return;
        }

        if (isJoining) return;
        setIsJoining(true);

        try {
            const joinResponse = await apiClient.joinTeam(codeToJoin.trim());
            if (!joinResponse.success) {
                toast.error("Could not join team", {
                    description: joinResponse.message || "Please check the team code and try again.",
                });
                setIsJoining(false);
                return;
            }

            toast.success("Joined Team Successfully!", {
                description: "Redirecting to your team dashboard...",
            });
            setTimeout(() => {
                window.location.href = "/";
            }, 800);
        } catch (error) {
            console.error("Error joining team", error);
            toast.error("Error joining team. Please try again.");
            setIsJoining(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        await handleJoinWithCode(teamCode);
    };

    const filterByDomain = (domain: string) => {
        setSelectedDomain(domain);
        if (domain === "all") {
            setPublicTeams(allTeams);
        } else {
            setPublicTeams(
                allTeams.filter(
                    (team) => team.domain?.trim().toLowerCase() === domain.trim().toLowerCase()
                )
            );
        }
    };

    const handleApplyPublicTeam = async (team: PublicTeamItem) => {
        if (isJoining) return;
        setIsJoining(true);
        try {
            const applyResponse = await apiClient.applyToJoinTeam(team.team_id);
            if (!applyResponse.success) {
                toast.error("Could not apply to team", {
                    description: applyResponse.message || "Failed to submit join application.",
                });
                setIsJoining(false);
                return;
            }

            setPopUp(false);
            toast.success(`Application Sent to ${team.team_name}!`, {
                description: "The team leader will review and accept/decline your request.",
            });
        } catch (error) {
            console.error("Error applying to team:", error);
            toast.error("Error submitting application. Please try again.");
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-black text-white">
            <NavBar userName={userName} />

            <main className="flex-grow flex flex-col justify-center items-center px-4 md:px-6">
                {popUp && (
                    <>
                        <div
                            className="backdrop-blur-md fixed inset-0 bg-black/80 z-50 transition-opacity"
                            onClick={() => setPopUp(false)}
                        />
                        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
                            <div className="bg-[#181818] border border-neutral-800 p-6 md:p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                                <div className="w-full flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="text-2xl font-bold flex items-center gap-2">
                                            <Users className="w-6 h-6 text-yellow-400" /> Apply to a Public Team
                                        </h3>
                                        <p className="text-xs text-neutral-400 mt-1">
                                            Click on any team card to send a join request to the team leader.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setPopUp(false)}
                                        className="text-neutral-400 hover:text-white text-lg font-bold px-2 py-1"
                                    >
                                        ✕
                                    </button>
                                </div>

                                {/* Domain Filters */}
                                <div className="flex flex-wrap gap-2 mb-6 justify-center">
                                    <button
                                        type="button"
                                        className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold transition-all duration-200 ${
                                            selectedDomain === "all"
                                                ? "bg-white text-black scale-105"
                                                : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                                        }`}
                                        onClick={() => filterByDomain("all")}
                                    >
                                        All Domains ({allTeams.length})
                                    </button>
                                    {domains.map((domain) => {
                                        const count = allTeams.filter(
                                            (t) => t.domain?.toLowerCase() === domain.toLowerCase()
                                        ).length;
                                        return (
                                            <button
                                                key={domain}
                                                type="button"
                                                className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-semibold capitalize transition-all duration-200 ${
                                                    selectedDomain === domain
                                                        ? "bg-white text-black scale-105"
                                                        : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
                                                }`}
                                                onClick={() => filterByDomain(domain)}
                                            >
                                                {domain} ({count})
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Team Grid */}
                                {publicTeams.length > 0 ? (
                                    <div
                                        ref={scrollContainerRef}
                                        className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full"
                                    >
                                        {publicTeams.map((team, index) => (
                                            <div
                                                key={team.team_id || index}
                                                onClick={() => handleApplyPublicTeam(team)}
                                                className="cursor-pointer group relative bg-neutral-900 border border-neutral-800 hover:border-neutral-500 rounded-xl p-5 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] flex flex-col justify-between"
                                                style={{
                                                    backgroundImage: `linear-gradient(rgba(18, 18, 18, 0.92), rgba(18, 18, 18, 0.95)), url('/team-card2.svg')`,
                                                    backgroundSize: "cover",
                                                    backgroundPosition: "center",
                                                }}
                                            >
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <span className="text-xs font-mono uppercase bg-neutral-800 text-neutral-400 px-2.5 py-1 rounded-md border border-neutral-700">
                                                            Code: <strong className="text-white">{team.team_id}</strong>
                                                        </span>
                                                        <h4 className="text-xl font-bold text-white mt-2 group-hover:text-yellow-400 transition-colors">
                                                            {team.team_name}
                                                        </h4>
                                                    </div>
                                                    <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 px-3 py-1 rounded-full capitalize font-medium flex items-center gap-1">
                                                        <Tag className="w-3 h-3" /> {team.domain || "General"}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between border-t border-neutral-800/80 pt-3 mt-2 text-xs text-neutral-400">
                                                    <div className="flex items-center gap-1.5">
                                                        <Phone className="w-3.5 h-3.5 text-neutral-500" />
                                                        <span>{team.contact}</span>
                                                    </div>
                                                    <Button
                                                        size="sm"
                                                        disabled={isJoining}
                                                        className="bg-white hover:bg-neutral-200 text-black font-semibold text-xs px-3 py-1 h-7 rounded-md"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleApplyPublicTeam(team);
                                                        }}
                                                    >
                                                        {isJoining ? "Applying..." : "Apply to Join →"}
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-12 text-neutral-400">
                                        <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
                                        <p>No public teams found in this domain.</p>
                                    </div>
                                )}

                                <Button
                                    className="mt-6 w-full max-w-xs bg-neutral-800 hover:bg-neutral-700 text-white font-semibold py-2.5 rounded-xl border border-neutral-700"
                                    onClick={() => setPopUp(false)}
                                >
                                    Close
                                </Button>
                            </div>
                        </div>
                    </>
                )}

                <div className="w-full max-w-md space-y-6 bg-[#1a1a1a] p-8 rounded-2xl border border-neutral-800 shadow-xl">
                    <h2 className="text-3xl md:text-4xl font-bold text-center">
                        Join Team
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label
                                htmlFor="teamCode"
                                className="block text-sm font-medium text-gray-400 text-center"
                            >
                                Enter 6-Digit Team Code{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <div className="flex justify-center py-2">
                                <InputOTP
                                    value={teamCode}
                                    onChange={handleInputChange}
                                    maxLength={6}
                                    disabled={isJoining}
                                >
                                    <InputOTPGroup className="flex space-x-2 justify-center">
                                        {Array.from({ length: 6 }, (_, index) => (
                                            <InputOTPSlot
                                                key={index}
                                                index={index}
                                                className="bg-[#2a2a2a] border border-gray-600 text-white md:w-12 md:h-12 text-center rounded-lg text-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                            />
                                        ))}
                                    </InputOTPGroup>
                                </InputOTP>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={isJoining || teamCode.length < 3}
                            className="w-full bg-white hover:bg-gray-200 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition duration-200"
                        >
                            {isJoining ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Joining Team...</span>
                                </>
                            ) : (
                                <>
                                    <span>Join Team</span>
                                    <ArrowUpRight className="h-5 w-5" />
                                </>
                            )}
                        </Button>

                        <p className="text-sm text-center text-neutral-400">
                            Don't have a team?{" "}
                            <button
                                type="button"
                                onClick={() => {
                                    setPopUp(true);
                                    setClick(!click);
                                }}
                                className="text-white font-semibold underline underline-offset-4 hover:text-yellow-400 transition-colors"
                            >
                                Browse Public Teams
                            </button>
                        </p>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default JoinTeam;
