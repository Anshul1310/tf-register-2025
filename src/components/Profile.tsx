import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormItem,
  FormControl,
  FormLabel,
  FormMessage,
  FormField,
} from "@/components/ui/form";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import WaterDropGrid from "./WaterDropGrid";
import { supabase } from "@/utiils/supabase";
import { apiClient } from "@/utiils/api";
import { getYearOfStudy } from "@/utiils/yearOfStudy";


const genders = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Others" },
];
const mess = [
  { value: "Mega Mess II GF", label: "Mega Mess II GF" },
  { value: "Mega Mess II FF", label: "Mega Mess II FF" },
  { value: "Mega Mess I GF", label: "Mega Mess I GF" },
  { value: "Annapurna", label: "Annapurna" },
  { value: "Sabari", label: "Sabari" },
  { value: "Kailash", label: "Kailash" },
  { value: "A-mess", label: "A-mess" },
  { value: "Opal Mess GF", label: "Opal Mess GF" },
  { value: "Opal Mess FF", label: "Opal Mess FF" },
];
const hostels = [
  // Boys Hostels
  { value: "Agate", label: "Agate" },
  { value: "Garnet A", label: "Garnet A" },
  { value: "Garnet B", label: "Garnet B" },
  { value: "Garnet C", label: "Garnet C" },
  { value: "Zircon A", label: "Zircon A" },
  { value: "Zircon B", label: "Zircon B" },
  { value: "Zircon C", label: "Zircon C" },
  { value: "Beryl", label: "Beryl" },
  { value: "Amber A", label: "Amber A" },
  { value: "Amber B", label: "Amber B" },
  { value: "Coral", label: "Coral" },
  { value: "Aquamarine A", label: "Aquamarine A" },
  { value: "Aquamarine B", label: "Aquamarine B" },
  { value: "Ruby", label: "Ruby" },
  { value: "Emerald", label: "Emerald" },
  { value: "Pearl", label: "Pearl" },
  { value: "Sapphire", label: "Sapphire" },
  { value: "Topaz", label: "Topaz" },
  { value: "Lapis", label: "Lapis" },
  { value: "Diamond", label: "Diamond" },
  { value: "Jade", label: "Jade" },
  { value: "Jasper", label: "Jasper" },
  { value: "Amethyst", label: "Amethyst" },
  // Girls Hostels
  { value: "Opal A", label: "Opal A" },
  { value: "Opal B", label: "Opal B" },
  { value: "Opal C", label: "Opal C" },
  { value: "Opal D", label: "Opal D" },
  { value: "Opal E", label: "Opal E" },
  { value: "Opal F", label: "Opal F" },
];


type User = {
  name: string;
  personalEmail: string;
  hostel: string;
  rollNumber: string;
  isPartofTeam: string;
  teamId: string;
  gender: string;
  mess: string;
};

const schema = z.object({
  name: z.string().min(1, "Full Name is required"),
  rollNumber: z.string().length(9, "Roll Number must be exactly 9 digits").regex(/^\d+$/, "Roll Number must contain only digits"),
  personalEmail: z.string().email("Invalid personal email address"),
  hostel: z.string().nonempty("Hostel is required"),
  gender: z.string().nonempty("Gender is required"),
  mess: z.string().nonempty("Mess is required"),
});

const Profile = () => {
  const [_, setUserDetails] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      rollNumber: "",
      personalEmail: "",
      hostel: "",
      gender: "",
      mess: "",
    },
  });

  useEffect(() => {
    const getData = async () => {
      try {
        const {
          data: { user },
          error
        } = await supabase.auth.getUser();

        if(error || !user) {
          console.error("Error fetching user details:", error);
          window.location.href = "/login";
          return;
        }

        const userResponse = await apiClient.getUserById(user.id);
        const userData = userResponse.data;

        if(userData) {
          setUserDetails(userData);
          const rawGender = (userData?.gender || "").toLowerCase();
          form.reset({
            name: userData?.name || "",
            rollNumber: userData?.roll_number || "",
            personalEmail: userData?.email || "",
            hostel: userData?.hostel || "",
            gender: rawGender === "m" ? "male" : rawGender === "f" ? "female" : rawGender,
            mess: userData?.mess || "",
          });
        }
        setLoading(false);
      } catch (error) {
        console.error("Error fetching user details:", error);
        setLoading(false);
      }
    };

    getData();
  }, [form]);

  const onSubmit = async (data: any) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if(error || !user) {
        console.error("Error fetching user details:", error);
        setIsSubmitting(false);
        return;
      }

      const updateResponse = await apiClient.updateProfile({
        name: data.name,
        roll_number: data.rollNumber,
        email: data.personalEmail,
        hostel: data.hostel,
        mess: data.mess,
        gender: data.gender,
      });

      if(!updateResponse.success) {
        console.error("Error updating user details:", updateResponse.message);
        setIsSubmitting(false);
        return;
      }

      window.location.href = "/";
    } catch (error) {
      console.error("Error submitting the form:", error);
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="text-xl"></p>
      </div>
    );
  }

  return (
    <>
      <nav className="flex justify-between bg-black items-center p-[15px] md:p-4 border-b-[1px] border-neutral-800">
        <img src="/motif2.svg" alt="Logo" style={{ width: '40px', aspectRatio: '63 / 29' }} className="md:hidden block" />
        <img src="/motif-desk2.svg" alt="Logo" style={{ width: '120px', aspectRatio: '155 / 20' }} className="md:block hidden" />
        <img src="/register.svg" alt="Logo" style={{ width: '110px', aspectRatio: '96 / 20' }} />
      </nav>
      <div className="flex">
        <div className="bg-white w-full md:block hidden overflow-hidden">
          <WaterDropGrid />
        </div>
        <div className="flex flex-col w-full justify-center items-center min-h-screen bg-black p-4">
          <div className="flex self-start ml-4 mb-2 cursor-pointer">
            <img src="/left-arrow.svg" alt="Logo" style={{ width: '15px', aspectRatio: '13 / 10' }} />
            <a href="/" className="text-neutral-500 text-sm self-center pl-2 hover:text-white transition-[1s]">GO BACK</a>
          </div>
          <h1 className="md:text-2xl text-3xl ml-8 mb-4 text-white md:text-left w-full text-left">Complete your Application</h1>
          <p className="md:text-xs mb-4 ml-4 text-left md:text-sm text-white">
            Please enter your details to attend TransfiNITTe 2025 Hackathon. By entering your information, you acknowledge you have read our <a href="/rulebook" className="underline underline-offset-4"> Privacy Policy</a>
          </p>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="text-white p-6 rounded-lg shadow-md w-full space-y-2"
            >
              {/* First Name */}
              <FormField
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input type="text" placeholder="Full Name" {...field} className="bg-[#1a1a1a] border border-gray-600 mt-0 rounded-md p-2" />
                    </FormControl>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />

              {/* Roll Number */}
              <FormField
                name="rollNumber"
                render={({ field }) => {
                  const yearInfo = getYearOfStudy(field.value);
                  return (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Roll Number</FormLabel>
                        {yearInfo.yearName && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            🎓 {yearInfo.yearName} (Batch &apos;{yearInfo.batchYear})
                          </span>
                        )}
                      </div>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Enter Roll Number (e.g. 112125005)"
                          {...field}
                          className="bg-[#1a1a1a] border mt-0 border-gray-600 rounded-md p-2"
                        />
                      </FormControl>
                      <FormMessage className="text-red-500" />
                    </FormItem>
                  );
                }}
              />

              {/* Personal Email */}
              <FormField
                name="personalEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Personal Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter your personal email (e.g. Gmail)"
                        {...field}
                        className="bg-[#1a1a1a] mt-0 border border-gray-600 rounded-md p-2"
                      />
                    </FormControl>
                    <p className="text-[11px] text-neutral-400">
                      Official hackathon notifications and event passes will be sent here.
                    </p>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />

              {/* Hostel */}
              <FormField
                name="hostel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hostel</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="bg-[#1a1a1a] border border-gray-600 rounded-md">
                          <SelectValue placeholder="Select Hostel" />
                        </SelectTrigger>
                        <SelectContent>
                          {hostels.map((hostel) => (
                            <SelectItem key={hostel.value} value={hostel.value}>
                              {hostel.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />

              {/* Mess */}
              <FormField
                name="mess"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mess</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="bg-[#1a1a1a] border border-gray-600 rounded-md">
                          <SelectValue placeholder="Select Mess" />
                        </SelectTrigger>
                        <SelectContent>
                          {mess.map((mess) => (
                            <SelectItem key={mess.value} value={mess.value}>
                              {mess.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />

              {/* Gender (Select) */}
              <FormField
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <SelectTrigger className="bg-[#1a1a1a] border border-gray-600 rounded-md">
                          <SelectValue placeholder="Select Gender" />
                        </SelectTrigger>
                        <SelectContent>
                          {genders.map((gender) => (
                            <SelectItem key={gender.value} value={gender.value}>
                              {gender.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage className="text-red-500" />
                  </FormItem>
                )}
              />
              <div className="w-full flex md:flex-row-reverse">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="md:px-16 md:w-auto mt-4 w-full py-4 px-4 bg-white text-black rounded-lg font-bold hover:bg-gray-300 transition duration-300 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving Profile...</span>
                    </>
                  ) : (
                    "Proceed"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </>
  );
};

export default Profile;
