import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { ArrowUpRight } from "lucide-react";
import { supabase } from "@/utiils/supabase";
import { apiClient } from "@/utiils/api";
import NavBar from "./Navbar";
import { toast } from "sonner";

const CreateTeam = () => {
    const [userName, setUsername] = useState<string | undefined>(undefined);
    const [userInfo, setUserInfo] = useState<any | null>(null);

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
                const response = await apiClient.getUserById(user.id);
                if (response.success && response.data) {
                    setUsername(response.data.name);
                }
                setUserInfo(user);
            } catch (error) {
                console.error(error);
            }
        };
        fetchUser();
    }, []);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await apiClient.createTeam({
                name: data.name as string,
                contactNumber: data.contactNumber as string,
                leader_email: userInfo?.email,
                leader_user_id: userInfo?.id,
            });

            if (!response.success) {
                toast("Whoops!", {
                    description: response.message || "Error creating team. Please try again.",
                });
                return;
            }

            window.location.href = "/";
        } catch (error: any) {
            console.error("Error creating team:", error);
            toast("Whoops!", {
                description: "Error creating team. Please try again.",
            });
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-black text-white">
            <NavBar userName={userName} />

            <main className="flex-grow flex flex-col justify-center items-center px-4 md:px-6">
                <div className="w-full max-w-md space-y-6 bg-[#1a1a1a] p-8 rounded-lg shadow-lg">
                    <h2 className="text-3xl md:text-4xl font-bold text-center">
                        Create Team
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label
                                htmlFor="name"
                                className="block text-sm font-medium text-gray-300"
                            >
                                Name <span className="text-red-500">*</span>
                            </label>
                            <Input
                                type="text"
                                id="name"
                                name="name"
                                required
                                placeholder="Enter team name"
                                className="bg-[#2a2a2a] text-white border border-gray-600 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div className="space-y-2">
                            <label
                                htmlFor="contactNumber"
                                className="block text-sm font-medium text-gray-300"
                            >
                                Contact Number{" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <Input
                                type="text"
                                pattern="[0-9]{10}"
                                id="contactNumber"
                                name="contactNumber"
                                required
                                placeholder="Enter contact number"
                                className="bg-[#2a2a2a] text-white border border-gray-600 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-white hover:bg-gray-200 text-black font-bold py-3 rounded-lg flex items-center justify-center gap-2"
                        >
                            <span>Create Team</span>
                            <ArrowUpRight className="h-5 w-5" />
                        </Button>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default CreateTeam;
