import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import { supabase } from "@/utiils/supabase";
import { apiClient } from "@/utiils/api";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel } from "./ui/dropdown-menu";
import {
    Tooltip,
    TooltipProvider,
    TooltipTrigger,
} from "./ui/tooltip";
import React from "react";

type NavBarProps = {
    userName?: string;
};

type Announcement = {
    announcement_id: string;
    title: string;
    body: string;
    created_at: string;
};

const NavBar: React.FC<NavBarProps> = ({ userName }) => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isBellOpen, setIsBellOpen] = useState(false);
    const bellRef = useRef<HTMLDivElement | null>(null);
    const seenKey = "tf_seen_announcement_at";
    const [seenAt, setSeenAt] = useState(
        () => localStorage.getItem(seenKey) || ""
    );

    const latestTimestamp = useMemo(() => {
        return announcements[0]?.created_at || "";
    }, [announcements]);

    const unseen = useMemo(() => {
        if (!latestTimestamp) return false;
        return (
            !seenAt ||
            new Date(latestTimestamp).getTime() > new Date(seenAt).getTime()
        );
    }, [latestTimestamp, seenAt]);

    const loadAnnouncements = async () => {
        try {
            const response = await apiClient.getAnnouncements();
            if (response.success && response.data) {
                setAnnouncements(response.data as Announcement[]);
            }
        } catch (error) {
            console.error("Failed to load announcements:", error);
        }
    };

    useEffect(() => {
        loadAnnouncements();
        const intervalId = window.setInterval(loadAnnouncements, 60000);
        const handleClickOutside = (event: MouseEvent) => {
            if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
                setIsBellOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            window.clearInterval(intervalId);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleOptionClick = async (option: string) => {
        if (option === "Profile") {
            window.location.href = "/profile";
        } else if (option === "Logout") {
            await supabase.auth.signOut();
            window.location.href = "/login";
        }
    };

    const handleBellClick = () => {
        setIsBellOpen((prev) => !prev);
        if (latestTimestamp) {
            localStorage.setItem(seenKey, latestTimestamp);
            setSeenAt(latestTimestamp);
        }
    };

    const getFirstLetter = (name: string | undefined) => {
        return name ? name.charAt(0).toUpperCase() : "";
    };

    return (
        <nav className="flex justify-between items-center p-4 md:p-6 border-b-[1px] border-neutral-800 max-h-[64px]">
            <img
                src="/motif2.svg"
                alt="Logo"
                style={{ width: "40px", aspectRatio: "63 / 29" }}
                className="md:hidden block"
            />
            <img
                src="/motif-desk2.svg"
                alt="Logo"
                style={{ width: "120px", aspectRatio: "155 / 20" }}
                className="md:block hidden"
            />
            <div className="flex items-center gap-3">
                <div ref={bellRef} className="relative">
                    <button
                        type="button"
                        onClick={handleBellClick}
                        className="relative w-10 h-10 rounded-full border border-neutral-700 bg-[#111111] text-white flex items-center justify-center hover:bg-[#1a1a1a] transition-colors"
                        aria-label="Announcements"
                    >
                        <Bell className="w-4.5 h-4.5" />
                        {unseen && (
                            <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-red-500 border border-black" />
                        )}
                    </button>

                    {isBellOpen && (
                        <div className="absolute right-0 mt-3 w-[22rem] max-w-[calc(100vw-1rem)] rounded-2xl border border-neutral-800 bg-[#101010] shadow-2xl overflow-hidden z-50">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
                                <div>
                                    <p className="text-sm font-semibold text-white">Announcements</p>
                                    <p className="text-[11px] text-neutral-400">Newest updates first</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsBellOpen(false)}
                                    className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="max-h-80 overflow-y-auto">
                                {announcements.length === 0 ? (
                                    <div className="p-4 text-sm text-neutral-400">No announcements yet.</div>
                                ) : (
                                    announcements.map((announcement) => (
                                        <div key={announcement.announcement_id} className="px-4 py-3 border-b border-neutral-900 last:border-b-0 hover:bg-white/5 transition-colors">
                                            <p className="text-sm font-semibold text-white leading-tight">{announcement.title}</p>
                                            <p className="mt-1 text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed">{announcement.body}</p>
                                            <p className="mt-2 text-[11px] text-neutral-500">
                                                {new Date(announcement.created_at).toLocaleString()}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Avatar
                                        className="cursor-pointer bg-[#1a1a1a] border border-gray-600"
                                    >
                                        <AvatarFallback className="bg-[#1a1a1a] text-white">
                                            {getFirstLetter(userName)}
                                        </AvatarFallback>
                                    </Avatar>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-64 relative r-16">
                                    <DropdownMenuLabel className="text-normal">
                                        Hi, {userName}
                                    </DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => handleOptionClick("Profile")}>
                                        Edit Profile
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-red-500" onClick={() => handleOptionClick("Logout")}>
                                        Logout
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </TooltipTrigger>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </nav>
    );
};

export default NavBar;
