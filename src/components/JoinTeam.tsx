import React, { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { ArrowUpRight } from "lucide-react";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from "@/components/ui/input-otp";
import { supabase } from "@/utiils/supabase";
import { apiClient } from "@/utiils/api";
import NavBar from "./Navbar";
import { toast } from "sonner";


const JoinTeam = () => {
    const [centeredIndex, setCenteredIndex] = useState<number | null>(null);
    const [click, setClick] = useState<boolean>(false);
    const scrollContainerRef = useRef<HTMLDivElement | null>(null);
    const [teamCode, setTeamCode] = useState<string>("");
    const [userName, setUsername] = useState<string | undefined>(undefined);
    const [popUp, setPopUp] = useState<boolean>(false);
    const [allTeams, setAllTeams] = useState<Array<{ team_id: string, team_name: string, contact: string, domain: string }>>([]);
    const [publicTeams, setPublicTeams] = useState<Array<{ team_id: string, team_name: string, contact: string, domain: string }>>([]); const [domains, setDomains] = useState<Array<string>>([]);
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const containerCenter = container.getBoundingClientRect().left + container.offsetWidth / 2;
            let minDistance = Infinity;
            let newCenteredIndex = 0;

            Array.from(container.children).forEach((child, index) => {
                if (child instanceof HTMLElement) {
                    const childCenter = child.getBoundingClientRect().left + child.offsetWidth / 2;
                    const distance = Math.abs(containerCenter - childCenter);
                    if (distance < minDistance) {
                        minDistance = distance;
                        newCenteredIndex = index;
                    }
                }
            });
            setCenteredIndex(newCenteredIndex);
        };

        handleScroll();
        container.addEventListener('scroll', handleScroll, { passive: true });

        return () => container.removeEventListener('scroll', handleScroll);
    }, [publicTeams, click]);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const {
                    data: { user },
                    error: userError,
                } = await supabase.auth.getUser();
                if (userError || !user) {
                    if (userError) console.error(userError);
                    return;
                }
                const userResponse = await apiClient.getUserById(user.id);
                if (userResponse.success && userResponse.data) {
                    setUsername(userResponse.data.name);
                }

                const publicTeamsResponse = await apiClient.getPublicTeams();
                if (publicTeamsResponse.success && publicTeamsResponse.data) {
                    const formattedTeams = publicTeamsResponse.data.map((team: any) => ({
                        team_id: team.team_id,
                        team_name: team.name,
                        contact: team.contact,
                        domain: team.domain,
                    }));
                    setPublicTeams(formattedTeams);
                    setAllTeams(formattedTeams);
                }
            } catch (error) {
                console.error(error);
            }
        };
        fetchUser();
        setDomains(["software", "hardware", "entrepreneurship", "management"]);
    }, []);

    const handleInputChange = (value: string) => {
        setTeamCode(value);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!teamCode) {
            toast("Whoops!", {
                description: "Team code is required.",
            });
            return;
        }

        try {
            const joinResponse = await apiClient.joinTeam(teamCode);
            if (!joinResponse.success) {
                toast("Whoops!", {
                    description: joinResponse.message || "Error joining team. Please try again.",
                });
                return;
            }

            toast("Success!", {
                description: "You have successfully joined the team.",
            });
            setTimeout(() => {
                window.location.href = "/";
            }, 1000);
        } catch (error) {
            console.error("Error joining team", error);
            toast("Whoops!", {
                description: "Error joining team. Please try again.",
            });
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-black text-white">
            <NavBar userName={userName} />


            <main className="flex-grow flex flex-col justify-center items-center px-4 md:px-6">
                {popUp && (<>
                    <div className="backdrop-blur-md fixed inset-0 bg-black bg-opacity-50 z-50" />
                    <div className=" backdrop-blur-none fixed inset-0 flex items-center justify-center z-50">
                        <div className="backdrop-blur-none p-6 rounded-lg shadow-lg flex flex-col items-center">
                            <h3 className="text-xl font-bold mb-4">Join a Public Team</h3>
                            {domains && (<div className="flex  space-x-1 md:space-x-4 mb-4"><>
                                {domains.map((domain) => (
                                    <span
                                        key={domain}
                                        className="px-3 py-1 bg-white text-black rounded-full text-[9px]  md:text-sm hover:scale-105 transition-transform duration-200 cursor-pointer"
                                        onClick={() =>
                                            setPublicTeams(
                                                allTeams.filter(team => team.domain?.trim().toLowerCase() === domain.trim().toLowerCase())
                                            )
                                        }
                                    >
                                        {domain.charAt(0).toUpperCase() + domain.slice(1)}
                                    </span>
                                ))}    <span
                                    className="px-3 py-1 bg-white text-black rounded-full text-[9px]  md:text-sm cursor-pointer"
                                    onClick={() => setPublicTeams(allTeams)}
                                >
                                    All
                                </span></>
                            </div>)}
                            {publicTeams.length > 0 ? (
                                <div ref={scrollContainerRef} className="flex space-x-4 overflow-x-auto no-scrollbar snap-x snap-mandatory w-[90vw] px-8">
                                    {publicTeams.map((team, index) => (
                                        <div
                                            key={team.team_id}
                                            className={`min-w-[300px] no-scrollbar md:min-w-[400px] flex-shrink-0 rounded-lg shadow-md snap-center transition-transform duration-300 ease-in-out
                                    ${centeredIndex === index ? "scale-115 z-10" : "scale-90 opacity-80 z-10"}`}
                                            style={{
                                                backgroundImage: `url('/team-card2.svg')`,
                                                backgroundSize: "cover",
                                                backgroundRepeat: "no-repeat",
                                                aspectRatio: "343 / 216",
                                            }}
                                        >
                                            <p className="left-5 relative z-50 top-[65%] text-gray-300">{team.team_name}</p>
                                            <p className="left-5 relative z-50 top-[65%] text-gray-300">{team.contact}</p>
                                            <p className="text-right relative z-60 right-6 top-[55%] text-gray-300">{team.domain}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p>No public teams available at the moment.</p>
                            )}
                            <Button
                                className="mt-4 w-40  bg-white text-black font-bold py-2 rounded-lg"
                                onClick={() => setPopUp(false)}
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </>)} <div className="w-full max-w-md space-y-6 bg-[#1a1a1a] p-8 rounded-lg shadow-lg">
                    <h2 className="text-3xl md:text-4xl font-bold text-center">
                        Join Team
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label
                                htmlFor="teamCode"
                                className="block text-sm font-medium text-gray-400"
                            >
                                Enter Team Code{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <div className="flex justify-center">
                                <InputOTP
                                    value={teamCode}
                                    onChange={handleInputChange}
                                    maxLength={6}
                                >
                                    <InputOTPGroup className="flex space-x-2 justify-center">
                                        {Array.from(
                                            { length: 6 },
                                            (_, index) => (
                                                <InputOTPSlot
                                                    key={index}
                                                    index={index}
                                                    className="bg-[#2a2a2a] border border-gray-600 text-white md:w-12 md:h-12 text-center rounded-lg text-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            )
                                        )}
                                    </InputOTPGroup>
                                </InputOTP>
                            </div>
                        </div>
                        <Button
                            type="submit"
                            className="w-full bg-white hover:bg-gray-200 text-black font-bold py-3 rounded-lg flex items-center justify-center gap-2"
                        >
                            <span>Join Team</span>
                            <ArrowUpRight className="h-5 w-5" />
                        </Button>
                        <p className="text-sm">Don't have a team? <span onClick={() => { setPopUp(true); setClick(!click); }} className="underline underline-offset-4 cursor-pointer">Join a public team!</span></p>
                    </form>
                </div>
            </main>
        </div >
    );
};

export default JoinTeam;
