import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { load, CashfreeInstance } from "@cashfreepayments/cashfree-js";
import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
// import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Copy, Loader2 } from "lucide-react";
import { supabase } from "@/utiils/supabase";
import { apiClient } from "@/utiils/api";
import { getYearOfStudy } from "@/utiils/yearOfStudy";
import NavBar from "./Navbar";
import { IoExitOutline } from "react-icons/io5";
import { FaGlobe, FaLock, FaRegTrashAlt } from "react-icons/fa";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { VscDebugRestart } from "react-icons/vsc";
import { toast } from "sonner";

//import { set } from "animejs";
// import { timeStamp } from "console";
// const problem_statements = [
//   { value: "1", label: "1" },
//   { value: "2", label: "2" },
//   { value: "3", label: "3" },
// ];
const domains = [
  { value: "software", label: "software" },
  { value: "hardware", label: "hardware" },
  { value: "management", label: "management" },
  { value: "entrepreneurship", label: "entrepreneurship" },
];


type TeamMember = {
  user_id: string;
  name: string;
  email: string;
  roll_number: string;
  pfp: string;
};

type Team = {
  name: string;
  team_id: string;
  members: TeamMember[];
  payment_status: string;
  contact: string;
  leader: string;
  leader_user_id: string;
  problem_statement: string;
  domain: string;
  ispublic: boolean;
};

interface Order {
  payment_session_id: string;
  [key: string]: any; // for other fields returned by your backend
}

const Dashboard = () => {
  const [click, setClick] = useState(false);
  const [popUp, setPopUp] = useState(false);
  const cashfreeRef = useRef<CashfreeInstance | null>(null);
  const { teamId } = useParams<{ teamId: string }>();
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userName, setUsername] = useState<string | undefined>(undefined);
  const [isLead, setIsLead] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [paymentCount, setPaymentCount] = useState<number>(0);
  const [paymentPrice, setPaymentPrice] = useState<number>(200);
  const [minTeamMembers, setMinTeamMembers] = useState<number>(1);
  const [teamCap, setTeamCap] = useState<number>(50);
  const [cashfreeMode, setCashfreeMode] = useState<"sandbox" | "production">("sandbox");

  const navigate = useNavigate();
  // const schema = z.object({
  // teamName: z.string().min(1, "Name is required"),
  // rollNumber: z.string().length(9, "Roll Number must be exactly 9 digits").regex(/^\d+$/, "Roll Number must contain only digits"),
  // personalEmail: z.string().email("Invalid email address"),
  // hostel: z.string().nonempty("Hostel is required"),
  // gender: z.string().nonempty("Gender is required"),
  //   timeStamp: z.string(),
  //   file: z.any().refine((fileList) => fileList && fileList.length === 1, "File is required"),
  // });

  const psschema = z.object({
    problem_statement: z.string().optional(),
    domain: z.string().nonempty("Domain is required"),
  });
  //  const testUpload = async () => {
  //   const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

  //   const { data, error } = await supabase.storage
  //     .from('midreview_bucket')
  //     .upload('test.txt', testFile);

  //   console.log('Test upload:', { data, error });
  // };

  // // Call it in useEffect to test immediately when component loads
  // useEffect(() => {
  //   setIsLoading(true);
  //   const fetchDetails = async () => {
  //     // ... your existing fetchDetails code

  //     // Add this line at the end of fetchDetails
  //     await testUpload(); // Test the upload
  //   };
  //   fetchDetails();
  // }, []);

  // const form = useForm({
  //   resolver: zodResolver(schema),
  //   defaultValues: {
  //     teamName: "",
  //     timeStamp: "",
  //     file: null,
  //   },
  // });

  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);

  const handleMakePublic = async () => {
    if (isActionLoading || !team) return;
    setIsActionLoading(true);
    const response = await apiClient.updateTeamVisibility(team.team_id, true);
    if (!response.success) {
      console.error("Error making team public:", response.message);
      toast.error(response.message || "Failed to make team public");
      setIsActionLoading(false);
      return;
    }
    toast.success("Team is now public");
    setTeam((prev) => (prev ? { ...prev, ispublic: true } : null));
    setIsActionLoading(false);
  };

  const handleMakePrivate = async () => {
    if (isActionLoading || !team) return;
    setIsActionLoading(true);
    const response = await apiClient.updateTeamVisibility(team.team_id, false);
    if (!response.success) {
      console.error("Error making team private:", response.message);
      toast.error(response.message || "Failed to make team private");
      setIsActionLoading(false);
      return;
    }
    toast.success("Team is now private");
    setTeam((prev) => (prev ? { ...prev, ispublic: false } : null));
    setIsActionLoading(false);
  };
  const psform = useForm({
    resolver: zodResolver(psschema),
    defaultValues: {
      problem_statement: "",
      domain: "",
    }
  })

  const domainValue = psform.watch('domain');
  useEffect(() => {
    if (domainValue) {
      psform.handleSubmit(onSubmitps)();
    }
  }, [domainValue])


  useEffect(() => {
    if (team) {
      psform.reset({
        problem_statement: team.problem_statement || "",
        domain: team.domain || "",
      });
    }
  }, [team]);


  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [isRequestActionLoading, setIsRequestActionLoading] = useState<Record<string, boolean>>({});

  const fetchJoinRequests = async (tId: string) => {
    try {
      const res = await apiClient.getTeamJoinRequests(tId);
      if (res.success && res.data) {
        setPendingRequests(res.data);
      }
    } catch (e) {
      console.error("Error fetching join requests:", e);
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    if (!team) return;
    setIsRequestActionLoading((prev) => ({ ...prev, [requestId]: true }));
    try {
      const res = await apiClient.acceptJoinRequest(team.team_id, requestId);
      if (res.success) {
        toast.success("Accepted join request!");
        const teamRes = await apiClient.getTeamById(team.team_id);
        if (teamRes.success && teamRes.data) {
          setTeam(teamRes.data);
        }
        fetchJoinRequests(team.team_id);
      } else {
        toast.error(res.message || "Failed to accept join request");
      }
    } catch (e: any) {
      toast.error(e.message || "Error accepting request");
    } finally {
      setIsRequestActionLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!team) return;
    setIsRequestActionLoading((prev) => ({ ...prev, [requestId]: true }));
    try {
      const res = await apiClient.rejectJoinRequest(team.team_id, requestId);
      if (res.success) {
        toast.info("Join request declined");
        fetchJoinRequests(team.team_id);
      } else {
        toast.error(res.message || "Failed to decline join request");
      }
    } catch (e: any) {
      toast.error(e.message || "Error declining request");
    } finally {
      setIsRequestActionLoading((prev) => ({ ...prev, [requestId]: false }));
    }
  };

  useEffect(() => {
    setIsLoading(true);
    const fetchDetails = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) {
          if (userError) console.error(userError);
          window.location.href = "/login";
          return;
        }

        setUserInfo(user);

        const userResponse = await apiClient.getUserById(user.id);
        if (userResponse.success && userResponse.data) {
          setUsername(userResponse.data.name);
        }

        if (teamId) {
          const teamResponse = await apiClient.getTeamById(teamId);
          if (!teamResponse.success || !teamResponse.data) {
            toast.error(teamResponse.message || "Access restricted: You must be a member of this team to view its details.");
            setIsLoading(false);
            navigate("/");
            return;
          }
          const fetchedTeam = teamResponse.data;
          const isMemberOrLeader =
            fetchedTeam.leader_user_id === user.id ||
            fetchedTeam.members?.some((m: any) => m.user_id === user.id);

          if (!isMemberOrLeader) {
            toast.error("Access restricted: You are not a member of this team");
            setIsLoading(false);
            navigate("/");
            return;
          }

          if (fetchedTeam.leader_user_id === user.id) {
            setIsLead(true);
            fetchJoinRequests(fetchedTeam.team_id);
          }
          setTeam(fetchedTeam);
        }

        setIsLoading(false);
      } catch (error) {
        console.error(error);
        setIsLoading(false);
      }
    };

    fetchDetails();
  }, [teamId]);

  const init = async (): Promise<Order | undefined> => {
    try {
      console.log(`Initializing Cashfree SDK in ${cashfreeMode} mode...`);
      cashfreeRef.current = await load({ mode: cashfreeMode });
      console.log("Cashfree SDK initialized successfully");

      if (!teamId) return undefined;

      const orderData = await apiClient.createCheckoutOrder({
        userId: userInfo?.id || teamId,
        teamName: team?.name || "team-name",
        teamId: teamId,
      });

      return orderData;
    } catch (error) {
      console.error("Error fetching order:", error);
      throw error;
    }
  };

  useEffect(() => {
    const fetchSuccessCountAndConfig = async () => {
      try {
        const statsResponse = await apiClient.getPaymentStats();
        if (statsResponse.success && typeof statsResponse.count === "number") {
          setPaymentCount(statsResponse.count);
        }
        if (statsResponse.success && typeof (statsResponse as any).team_cap === "number") {
          setTeamCap((statsResponse as any).team_cap);
        }

        const configResponse = await apiClient.getPaymentConfig();
        if (configResponse && configResponse.amount > 0) {
          setPaymentPrice(configResponse.amount);
        }
        if (configResponse && configResponse.environment) {
          setCashfreeMode(configResponse.environment);
        }
        if (configResponse && typeof configResponse.min_team_members === "number") {
          setMinTeamMembers(configResponse.min_team_members);
        }
        if (configResponse && typeof configResponse.team_cap === "number") {
          setTeamCap(configResponse.team_cap);
        }
      } catch (err) {
        console.warn("Could not load payment stats/config:", err);
      }
    };
    fetchSuccessCountAndConfig();
  }, []);

  const handlePay = async (): Promise<void> => {
    console.log("Handle pay called");
    console.log("Team members count:", team?.members?.length, "Minimum required from backend env:", minTeamMembers);
    console.log("Team data:", team);

    if (team?.members && team.members.length < minTeamMembers) {
      toast("Team Incomplete", {
        description: `This event requires at least ${minTeamMembers} member(s) to register. Current members: ${team.members.length}`,
      });
      return;
    }

    if (teamCap > 0 && paymentCount >= teamCap) {
      toast.error("Registration Cap Reached", {
        description: `Team registration capacity of ${teamCap} teams has been reached.`,
      });
      return;
    }

    try {
      const fetchedOrder = await init();
      if (fetchedOrder) {
        await doPayment(fetchedOrder);
      } else {
        toast.error("Failed to initialize checkout order with server.");
      }
    } catch (err: any) {
      console.error("Payment initiation error:", err);
      toast.error(err.message || "Failed to initialize payment order.");
    }
  };

  // Auto-verify payment if redirected back with order_id in query params
  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search);
    const returnedOrderId = queryParams.get("order_id");
    if (returnedOrderId && teamId) {
      // Clear order_id query param from address bar immediately
      window.history.replaceState({}, document.title, window.location.pathname);

      apiClient.verifyPayment(returnedOrderId, teamId).then((response) => {
        if (response.success && response.paid) {
          toast("Payment Verified!", {
            description: "Your registration payment has been verified successfully.",
          });
          setTeam((prev) => (prev ? { ...prev, payment_status: "PAID" } : null));
        } else {
          toast("Payment Verification Pending", {
            description: response.message || "Could not verify payment yet.",
          });
        }
      }).catch((err) => {
        console.error("Auto verification error:", err);
      });
    }
  }, [teamId]);

  const doPayment = async (order: Order): Promise<void> => {
    if (!order.payment_session_id) {
      console.error("Order not ready yet: missing payment_session_id");
      toast.error("Missing payment session ID from server");
      return;
    }

    if (!cashfreeRef.current) {
      console.log(`Loading Cashfree SDK in ${cashfreeMode} mode...`);
      cashfreeRef.current = await load({ mode: cashfreeMode });
    }

    const checkoutOptions = {
      paymentSessionId: order.payment_session_id,
      redirect: true,
      appearance: {
        width: "425px",
        height: "700px",
      },
    };

    try {
      console.log("Launching Cashfree checkout modal with session:", order.payment_session_id);
      const result = await cashfreeRef.current.checkout(checkoutOptions);

      if (result.error) {
        console.warn("Payment error from Cashfree SDK:", result.error);
        toast.error(result.error.message || "Cashfree checkout error");
      }

      if (result.redirect) {
        console.log("Payment will be redirected");
      }

      if (result.paymentDetails) {
        console.log("Payment completed:", result.paymentDetails);
        toast.success("Payment Received!", {
          description: "Verifying your registration...",
        });
        const verifyResponse = await apiClient.verifyPayment(order.order_id, teamId || "");
        if (verifyResponse.success && verifyResponse.paid) {
          setTeam((prev) => (prev ? { ...prev, payment_status: "PAID" } : null));
        }
      }
    } catch (error: any) {
      console.error("Checkout launch error:", error);
      toast.error(error.message || "Failed to launch Cashfree modal");
    }
  };
  const onSubmitps = async (data: any) => {
    if (!team) return;
    const response = await apiClient.updateTeamDetails(
      team.team_id,
      data.domain,
      data.problem_statement
    );
    if (!response.success) {
      console.error("Submission ps error:", response.message);
      return;
    }

    setTeam({
      ...team,
      problem_statement: data.problem_statement,
      domain: data.domain,
    });
  };

  const handleGenerateNewTeamId = async () => {
    if (isActionLoading || !team || !isLead) return;
    setIsActionLoading(true);
    try {
      const response = await apiClient.regenerateTeamId(team.team_id);
      if (!response.success || !response.new_team_id) {
        console.error("Error generating new team ID:", response.message);
        toast.error(response.message || "Could not regenerate team code.");
        setIsActionLoading(false);
        return;
      }
      toast.success("Team code updated!");
      setTimeout(() => {
        window.location.href = `/team/${response.new_team_id}`;
      }, 500);
    } catch (err) {
      setIsActionLoading(false);
    }
  };

  const handleLeaveTeam = async () => {
    if (isActionLoading || !team) return;
    setIsActionLoading(true);
    try {
      const response = await apiClient.leaveTeam();
      if (!response.success) {
        console.error("Error leaving team:", response.message);
        toast.error(response.message || "Error leaving team.");
        setIsActionLoading(false);
        return;
      }
      toast.success("Left team successfully");
      setTimeout(() => {
        navigate("/");
      }, 500);
    } catch (err) {
      setIsActionLoading(false);
    }
  };

  const handleDiscardTeam = async () => {
    if (isActionLoading || !isLead || !team) return;
    setIsActionLoading(true);
    try {
      const response = await apiClient.deleteTeam(team.team_id);
      if (!response.success) {
        console.error("Error discarding team:", response.message);
        toast.error(response.message || "Error discarding team.");
        setIsActionLoading(false);
        return;
      }
      toast.success("Team discarded successfully");
      setTimeout(() => {
        navigate("/");
      }, 500);
    } catch (err) {
      setIsActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        toast("Copied!", {
          description: "Team ID copied to clipboard.",
        });
      },
      (err) => {
        console.error("Could not copy text: ", err);
        toast("Whoops!", {
          description: "Could not copy team ID to clipboard.",
        });
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
        <Loader2 className="w-12 h-12 animate-spin mb-4" />
        <p className="text-xl"></p>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex justify-center items-center h-screen text-white">
        Team not found
      </div>
    );
  }

  console.log("Team: ", team);
  console.log("Team Cap (backend env):", teamCap);
  console.log("Can register (paymentCount < teamCap):", teamCap <= 0 || paymentCount < teamCap);
  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <NavBar userName={userName} />
      {popUp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 pr-0 w-11/12 md:w-1/3">
            <h2 className="text-xl font-semibold mb-4 text-black">Proceeding to payment.</h2>
            <p className="mb-4 text-black">Please note that you will not be able to change the domain after payment.</p>
            <div className="flex justify-end items-center">
              <Button
                className="relative text-white text-sm font-bold"
                onClick={() => setPopUp(false)}

              >
                X
              </Button>
              <Button
                className="relative text-white text-sm font-bold mx-10"
                onClick={() => { setPopUp(false); handlePay(); }}
              >
                Proceed
              </Button>
            </div>

          </div>

        </div>
      )}

      <div className="flex flex-col justify-between h-full flex-grow">
        <div className="flex-grow flex flex-col lg:flex-row-reverse lg:justify-between items-center lg:items-start px-4 md:px-6 pt-8">
          <div className="flex-grow flex flex-col lg:flex-col  lg:justify-center lg:items-end md:items-center   ">
            <div
              className="lg:w-[100%] md:w-1/2 w-full"
              style={{
                backgroundImage: `url('/team-card2.svg')`,
                backgroundSize: "cover",
                backgroundRepeat: "no-repeat",
                aspectRatio: "343 / 216",
                position: "relative",
              }}
            >
              <h2 className="text-[1.4em] font-semibold absolute bottom-0 left-0 p-[1em] md:p-[1.6em]">
                {team.name}
              </h2>
              <div className="absolute bottom-0 right-0 p-6 pb-4">
                {((team.payment_status === "Pending" ||
                  team.payment_status === "Failed") &&
                  (teamCap <= 0 || paymentCount < teamCap) &&
                  isLead) && (
                    <Button
                      className="bg-white text-black rounded-[120px] font-bold hover:bg-gray-100 transition duration-300 flex items-center justify-center gap-2 px-4 py-2"
                      onClick={() => setPopUp(true)}
                      disabled={!(isLead && (psform.watch("domain") || team.domain))}
                    >
                      <img src="/pay.svg" alt="Pay" className="h-5" />
                      <span className="text-xs font-bold text-black ml-1">Pay</span>
                    </Button>
                  )}
              </div>
            </div>
            <Form {...psform}>
              <form onSubmit={psform.handleSubmit(onSubmitps)}

                className="text-white  rounded-lg shadow-md lg:w-[100%]  md:w-[80vw] w-full space-y-2 mt-6 flex justify-center items-center  lg:justify-normal"
              >

                <FormField
                  name="domain"
                  render={({ field }) => (
                    <FormItem className="lg:w-full">
                      <FormLabel>Domain</FormLabel>
                      <FormControl>
                        <Select
                          onValueChange={(val) => {
                            field.onChange(val);

                          }}
                          value={field.value}
                          disabled={!(isLead && team.payment_status === "Pending")} // Disable if not lead or payment done

                        >
                          <SelectTrigger className="bg-[#1a1a1a] border border-gray-600 rounded-md w-[80vw] md:w-[40vw] lg:w-full">
                            <SelectValue placeholder={team.domain ? team.domain : "Select Domain"} />
                          </SelectTrigger>
                          <SelectContent className="w-[var(--radix-select-trigger-width)]">
                            {domains.map((domain) => (
                              <SelectItem key={domain.value} value={domain.value}>
                                {domain.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage className="text-red-500" />
                    </FormItem>
                  )}
                />

              </form>
            </Form>
          </div>
          <div className="flex">
            <div className="lg:w-[100%] h-full lg:pr-8 ">
              <div className="w-full h-full pt-3 mt-4 flex flex-col">
                <h1 className="font-spacegrotesk text-3xl lg:text-5xl font-medium">
                  Dashboard
                </h1>
                <span className="text-neutral-500 pt-2">
                  Invite your teammates by sharing the team ID.{" "}
                </span>
              </div>
              <div className="h-full w-full space-y-6 pt-8">
                {/* Pending Join Requests for Leader */}
                {isLead && pendingRequests.length > 0 && (
                  <div className="w-full bg-[#141414] border border-yellow-500/40 rounded-2xl p-5 mb-6 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base md:text-lg font-bold text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-pulse"></span>
                        Pending Join Requests ({pendingRequests.length})
                      </h3>
                      <span className="text-xs text-neutral-400">
                        Review & approve new members
                      </span>
                    </div>
                    <div className="space-y-3">
                      {pendingRequests.map((req) => {
                        const yearInfo = getYearOfStudy(req.user_roll_number);
                        const isActing = isRequestActionLoading[req.request_id];
                        return (
                          <div
                            key={req.request_id}
                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-black/70 border border-neutral-800 rounded-xl gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={req.user_pfp} />
                                <AvatarFallback className="text-black bg-neutral-200">
                                  {req.user_name?.charAt(0).toUpperCase() || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-white text-sm">
                                    {req.user_name}
                                  </span>
                                  {yearInfo.yearName && (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                      🎓 {yearInfo.yearName}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-neutral-400 flex items-center gap-2 flex-wrap mt-0.5">
                                  <span>{req.user_email}</span>
                                  {req.user_roll_number && <span>• {req.user_roll_number}</span>}
                                  {req.user_gender && (
                                    <span className="capitalize">• {req.user_gender}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 self-end sm:self-auto">
                              <Button
                                size="sm"
                                disabled={isActing}
                                onClick={() => handleAcceptRequest(req.request_id)}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 h-8 rounded-lg transition-colors"
                              >
                                {isActing ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  "Accept"
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isActing}
                                onClick={() => handleRejectRequest(req.request_id)}
                                className="border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs px-3 py-1.5 h-8 rounded-lg transition-colors"
                              >
                                Decline
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-4 h-full w-full py-4 pb-8">
                  <div className="pb-8 w-full h-full flex flex-col justify-between">
                    <ul className="flex flex-wrap gap-6 w-full">
                      {team.members &&
                        team.members
                          .sort((a) => (a.user_id === team.leader_user_id ? -1 : 1))
                          .map((member, index) => {
                            return (
                              <li
                                key={index}
                                className="flex items-center space-x-2 w-full lg:bg-neutral-900 lg:rounded-lg lg:border-[1px] lg:border-neutral-600 lg:p-4 relative"
                              >
                                <Avatar>
                                  <AvatarImage src={member.pfp} height={10} width={10} />
                                  <AvatarFallback className="text-black">
                                    {member.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="text-white text-[16px]">{member.name} {index === 0 && "(Lead)"}</span>
                                  <span className="text-white text-[12px] opacity-60">
                                    {member.roll_number}
                                  </span>
                                </div>
                              </li>
                            );
                          })}
                    </ul>
                    <div>
                      {isLead ?
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="m-5 text-black hover:bg-neutral-400">
                              Discard Team <FaRegTrashAlt className="text-[16px] ml-2" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                              <DialogTitle>Discard Team</DialogTitle>
                              <DialogDescription>
                                Discarding this team will remove all members from the team and erase its traces from our servers. Are you sure you want to discard this team?
                              </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button type="submit" onClick={handleDiscardTeam} disabled={team.payment_status === "PAID"}>Confirm</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                        :
                        <Button variant="outline" className="m-5 text-black hover:bg-neutral-400" disabled={team.payment_status === "PAID"} onClick={handleLeaveTeam}>
                          Leave Team <IoExitOutline className="text-xl ml-2" />
                        </Button>
                      }
                      {isLead && team.payment_status !== "PAID" && (
  <>
    {team.ispublic ? (
      <Button
        variant="outline"
        className="m-5 text-black hover:bg-neutral-400"
        onClick={() => setClick(true)}
      >
        Make Team Private <FaLock className="text-[16px] ml-2" />
      </Button>
    ) : (
      <Button
        variant="outline"
        className="m-5 text-black hover:bg-neutral-400"
        onClick={() => setClick(true)}
      >
        Make Team Public <FaGlobe className="text-[16px] ml-2" />
      </Button>
    )}

  
    {click && (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-lg shadow-lg w-[400px]">
          <h2 className=" text-black font-bold mb-2 text-xl">
            {team.ispublic ? "Make Team Private" : "Make Team Public"}
          </h2>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
            {team.ispublic
              ? "Making this team private will hide its details from the public team list. Are you sure you want to make this team private?"
              : "Making this team public will show its details on the public team list. Are you sure you want to make this team public?"}
          </p>

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              className="text-black hover:bg-neutral-200 dark:hover:bg-neutral-700"
              onClick={() => setClick(false)}
            >
              Cancel
            </Button>

            {team.ispublic ? (
              <Button
                variant="default"
                className="bg-black hover:bg-neutral-700 text-white"
                onClick={() => {
                  handleMakePrivate();
                  setClick(false); 
                }}
              >
                Confirm
              </Button>
            ) : (
              <Button
                variant="default"
                className="bg-black hover:bg-neutral-700 text-white"
                onClick={() => {
                  handleMakePublic();
                  setClick(false);
                }}
                disabled={team.payment_status === "PAID"}
              >
                Confirm
              </Button>
            )}
          </div>
        </div>
      </div>
    )}
  </>
)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t-[1px] p-4 px-8 border-neutral-800">
          <div className="flex justify-between items-center">
            <span className="font-semibold w-full">
              Payment Status:{" "}
            </span>
            <span className="font-semibold w-full text-yellow-500 text-right">
              {team.payment_status}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="font-semibold">Team ID:</span>
            <div className="flex items-center">
              <span>{team.team_id}</span>
              <Button
                onClick={() =>
                  copyToClipboard(team.team_id)
                }
                className="ml-2 p-1 bg-transparent hover:bg-gray-700 rounded-full"
              >
                <Copy className="h-4 w-4" />
              </Button>
              {isLead && <Button
                onClick={handleGenerateNewTeamId}
                className="ml-2 p-1 bg-transparent hover:bg-gray-700 rounded-full"
              >
                <VscDebugRestart className="h-4 w-4" />
              </Button>}
            </div>
          </div>
        </div>
      </div>
      {/* <Form {...psform}>
        <form
          onSubmit={psform.handleSubmit(onSubmitps)}
          className="text-white p-6 rounded-lg shadow-md w-full space-y-2 mt-6"
        > */}
      {/* <FormField
            name="domain"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Domain</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <SelectTrigger className="bg-[#1a1a1a] border border-gray-600 rounded-md">
                      <SelectValue placeholder="Select Domain" />
                    </SelectTrigger>
                    <SelectContent>
                      {domains.map((domain) => (
                        <SelectItem key={domain.value} value={domain.value}>
                          {domain.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormControl>
                <FormMessage className="text-red-500" />
              </FormItem>
            )}
          /> */}
      {/* <FormField
            name="problem_statement"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Problem Statement</FormLabel>
                <FormControl>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <SelectTrigger className="bg-[#1a1a1a] border border-gray-600 rounded-md">
                      <SelectValue placeholder="Select Problem Statement" />
                    </SelectTrigger>
                    <SelectContent>
                      {problem_statements.map((problem_statement) => (
                        <SelectItem key={problem_statement.value} value={problem_statement.value}>
                          {problem_statement.label}
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
            <Button type="submit" className="md:px-16 md:w-auto mt-4 w-full py-4 px-4 bg-white text-black rounded-lg font-bold hover:bg-gray-300 transition duration-300">
              Submit Problem Statement
            </Button>
          </div>
        </form>
      </Form> */}

      {/* <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onMidReviewSubmit)}
          className="text-white p-6 rounded-lg shadow-md w-full space-y-2 mt-6"
        >
          <FormField
            name="file"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Upload Mid Review File (PPT/PPTX)</FormLabel>
                <FormControl>
                  <Input type="file" accept=".ppt,.pptx" onChange={e => field.onChange(e.target.files)} className="bg-[#1a1a1a] border mt-0 border-gray-600 rounded-md p-2" />
                </FormControl>
                <FormMessage className="text-red-500" />
              </FormItem>
            )}
          />
          <div className="w-full flex md:flex-row-reverse">
            <Button type="submit" className="md:px-16 md:w-auto mt-4 w-full py-4 px-4 bg-white text-black rounded-lg font-bold hover:bg-gray-300 transition duration-300">
              Submit Mid Review
            </Button>
          </div>
        </form>
      </Form> */}

      {/* <Form {...form}> */}
      {/* <form
          onSubmit={form.handleSubmit(onFinalReviewSubmit)}
          className="text-white p-6 rounded-lg shadow-md w-full space-y-2 mt-6"
        >
          <FormField
            name="file"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Upload Final Review File (PPT/PPTX)</FormLabel>
                <FormControl>
                  <Input type="file" accept=".ppt,.pptx" onChange={e => field.onChange(e.target.files)} className="bg-[#1a1a1a] border mt-0 border-gray-600 rounded-md p-2" />
                </FormControl>
                <FormMessage className="text-red-500" />
              </FormItem>
            )}
          />
          <div className="w-full flex md:flex-row-reverse">
            <Button type="submit" className="md:px-16 md:w-auto mt-4 w-full py-4 px-4 bg-white text-black rounded-lg font-bold hover:bg-gray-300 transition duration-300">
              Submit Final Review
            </Button>
          </div>
        </form> */}
      {/* </Form> */}

    </div>

  );
};

export default Dashboard;
