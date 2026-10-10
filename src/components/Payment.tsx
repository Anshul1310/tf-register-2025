import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { 
  Loader2, 
  CreditCard, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowLeft, 
  Users, 
  AlertCircle, 
  Sparkles,
  Lock,
  Check
} from "lucide-react";
import { apiClient } from "@/utiils/api";
import { toast } from "sonner";
import { load, CashfreeInstance } from "@cashfreepayments/cashfree-js";

interface TeamData {
  team_id: string;
  name: string;
  leader: string;
  leader_user_id?: string;
  domain?: string;
  payment_status: string;
  members?: Array<{
    user_id: string;
    name: string;
    email: string;
    roll_number: string;
    pfp?: string;
  }>;
}

const Payment: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [team, setTeam] = useState<TeamData | null>(null);
  const [memberCount, setMemberCount] = useState<number>(0);
  const [minTeamMembers, setMinTeamMembers] = useState<number>(1);
  const [registrationPrice, setRegistrationPrice] = useState<number>(200);
  const [currency, setCurrency] = useState<string>("INR");
  const [cashfreeEnv, setCashfreeEnv] = useState<"sandbox" | "production">("sandbox");
  
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [isPaying, setIsPaying] = useState<boolean>(false);

  const cashfreeRef = useRef<CashfreeInstance | null>(null);

  // 1. Fetch team details, member count, and backend payment configuration
  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!teamId) {
        setIsInitializing(false);
        return;
      }

      try {
        // Fetch backend payment config (price & environment loaded from backend env)
        const configRes = await apiClient.getPaymentConfig();
        if (isMounted && configRes) {
          if (configRes.amount && configRes.amount > 0) {
            setRegistrationPrice(configRes.amount);
          }
          if (configRes.currency) {
            setCurrency(configRes.currency);
          }
          if (configRes.environment) {
            setCashfreeEnv(configRes.environment);
          }
          if (typeof configRes.min_team_members === "number") {
            setMinTeamMembers(configRes.min_team_members);
          }
        }

        // Fetch team details
        const teamRes = await apiClient.getTeamById(teamId);
        if (isMounted && teamRes.success && teamRes.team) {
          setTeam(teamRes.team);
          const members = teamRes.team.members || [];
          setMemberCount(members.length);
        } else if (isMounted && teamRes.data) {
          setTeam(teamRes.data);
          const members = teamRes.data.members || [];
          setMemberCount(members.length);
        }

        // Count members via endpoint if available
        const countRes = await apiClient.getMemberCount(teamId);
        if (isMounted && countRes.success && typeof countRes.count === "number") {
          setMemberCount(countRes.count);
        }
      } catch (err) {
        console.error("Error loading payment page data:", err);
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [teamId]);

  // 2. Check for redirect verification (?order_id=...)
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const orderId = queryParams.get("order_id");

    if (orderId && teamId) {
      setIsPaying(true);
      // Immediately clean the URL to avoid repeating verification on refresh
      window.history.replaceState({}, document.title, window.location.pathname);

      apiClient.verifyPayment(orderId, teamId).then((response) => {
        setIsPaying(false);
        if (response.success && response.paid) {
          toast.success("Payment Verified Successfully!", {
            description: "Your team registration is confirmed and active.",
          });
          setTeam((prev) => (prev ? { ...prev, payment_status: "PAID" } : null));
        } else {
          toast.error("Payment Verification Incomplete", {
            description: response.message || "Please check your transaction status or try again.",
          });
        }
      }).catch((err) => {
        setIsPaying(false);
        console.error("Verification error:", err);
      });
    }
  }, [location.search, teamId]);

  // Initialize Cashfree JS SDK with dynamic environment
  const getCashfreeInstance = async (): Promise<CashfreeInstance> => {
    if (cashfreeRef.current) {
      return cashfreeRef.current;
    }
    const mode = cashfreeEnv === "production" ? "production" : "sandbox";
    console.log(`Initializing Cashfree SDK in ${mode} mode...`);
    const instance = await load({ mode });
    cashfreeRef.current = instance;
    return instance;
  };

  // 3. Handle Cashfree Checkout
  const handleCashfreePayment = async () => {
    if (!teamId) {
      toast.error("Missing team ID");
      return;
    }

    if (memberCount < minTeamMembers) {
      toast.error("Team Incomplete", {
        description: `This event requires at least ${minTeamMembers} member(s) to register. Current members: ${memberCount}`,
      });
      return;
    }

    setIsPaying(true);

    try {
      // Create checkout order on backend (amount strictly taken from backend env)
      const orderData = await apiClient.createCheckoutOrder({
        teamId: teamId,
        userId: team?.leader_user_id || teamId,
        teamName: team?.name || "Team",
      });

      if (!orderData || (!orderData.payment_session_id && !orderData.order_id)) {
        throw new Error(orderData?.message || "Failed to initialize payment order with server");
      }

      // Load SDK with backend-matched environment
      const cashfree = await getCashfreeInstance();

      const checkoutOptions = {
        paymentSessionId: orderData.payment_session_id,
        redirect: true,
        appearance: {
          width: "425px",
          height: "700px",
        },
      };

      const result = await cashfree.checkout(checkoutOptions);

      if (result.error) {
        console.warn("Cashfree checkout error:", result.error);
        toast.error("Checkout issue", {
          description: result.error.message || "Could not launch Cashfree gateway.",
        });
      } else if (result.paymentDetails) {
        toast.success("Payment Received!", {
          description: "Verifying your registration...",
        });
        const verifyRes = await apiClient.verifyPayment(orderData.order_id, teamId);
        if (verifyRes.success && verifyRes.paid) {
          setTeam((prev) => (prev ? { ...prev, payment_status: "PAID" } : null));
          navigate(`/team/${teamId}`);
        }
      }
    } catch (err: any) {
      console.error("Payment initiation error:", err);
      toast.error("Payment Initiation Failed", {
        description: err.message || "An error occurred while communicating with Cashfree.",
      });
    } finally {
      setIsPaying(false);
    }
  };

  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
        <Loader2 className="w-10 h-10 animate-spin text-neutral-400 mb-4" />
        <p className="text-sm font-medium text-neutral-400">Loading Cashfree checkout & team details...</p>
      </div>
    );
  }

  const isAlreadyPaid = team?.payment_status?.toUpperCase() === "PAID";
  const hasMinMembers = memberCount >= minTeamMembers;

  return (
    <div className="flex flex-col min-h-screen bg-black text-white selection:bg-neutral-800 selection:text-white">
      {/* Top Navbar Header */}
      <header className="border-b border-neutral-800/80 px-6 py-4 flex items-center justify-between backdrop-blur-md bg-black/60 sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(teamId ? `/team/${teamId}` : "/")}
            className="text-neutral-400 hover:text-white hover:bg-neutral-900 gap-1.5 text-xs font-semibold px-2.5 py-1.5 h-auto rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Team
          </Button>
          <div className="h-4 w-px bg-neutral-800 hidden sm:block" />
          <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 hidden sm:inline">
            TransfiNITTe Registration
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-[11px] font-medium text-neutral-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            256-bit Encrypted Checkout
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow flex flex-col justify-center items-center px-4 py-10 md:px-6">
        <div className="w-full max-w-lg space-y-6">

          {/* Payment Status Card if Already Paid */}
          {isAlreadyPaid ? (
            <div className="bg-[#121212] border border-emerald-500/40 rounded-2xl p-8 text-center space-y-5 shadow-2xl shadow-emerald-500/5">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-400 animate-bounce">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Registration Fee Paid</h2>
                <p className="text-neutral-400 text-sm mt-1.5">
                  Team <span className="text-white font-semibold">{team?.name}</span> is officially registered and active!
                </p>
              </div>

              <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-4 text-xs font-mono text-neutral-300 space-y-1.5 text-left max-w-sm mx-auto">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Team ID:</span>
                  <span className="text-white font-bold">{team?.team_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Registration Fee:</span>
                  <span className="text-emerald-400 font-bold">₹{registrationPrice.toFixed(2)} {currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Payment Status:</span>
                  <span className="text-emerald-400 font-semibold">VERIFIED / PAID</span>
                </div>
              </div>

              <Button
                onClick={() => navigate(`/team/${teamId}`)}
                className="bg-white hover:bg-neutral-200 text-black font-bold px-6 py-2.5 rounded-xl transition duration-200"
              >
                Go to Team Dashboard
              </Button>
            </div>
          ) : (
            <div className="bg-[#141414] border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
              
              {/* Order Overview Header */}
              <div className="p-6 md:p-8 border-b border-neutral-800/80 bg-gradient-to-b from-neutral-900/60 to-transparent">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-neutral-400" />
                    Cashfree Payment
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                    {cashfreeEnv === "sandbox" ? "Cashfree Sandbox" : "Cashfree Secure Gateway"}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                      {team?.name || "Team Registration"}
                    </h1>
                    <div className="text-xs text-neutral-400 flex items-center gap-3 mt-1.5">
                      <span>ID: <code className="text-neutral-300 font-mono">{teamId}</code></span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-neutral-400" />
                        {memberCount} Members
                      </span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right bg-neutral-900/60 border border-neutral-800 rounded-xl p-3.5 sm:bg-transparent sm:border-0 sm:p-0">
                    <span className="text-xs text-neutral-400 block font-medium">Registration Fee</span>
                    <div className="text-3xl font-extrabold text-white tracking-tight">
                      ₹{registrationPrice.toFixed(2)}
                      <span className="text-xs font-semibold text-neutral-400 ml-1.5">{currency}</span>
                    </div>
                  </div>
                </div>

                {/* Team member check warning if < minTeamMembers */}
                {!hasMinMembers && (
                  <div className="mt-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Minimum Team Size Required:</span> TransfiNITTe teams must have at least {minTeamMembers} confirmed member(s) before paying. Current members: <b>{memberCount}/{minTeamMembers}</b>. Invite members from your team dashboard to unlock payment.
                    </div>
                  </div>
                )}
              </div>

              {/* Cashfree Payment Gateway Box */}
              <div className="p-6 md:p-8 space-y-6">
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 text-xs text-neutral-300 space-y-2">
                    <div className="flex items-center justify-between text-neutral-400 font-semibold uppercase text-[11px] tracking-wider">
                      <span>Payment Summary</span>
                      <span className="text-emerald-400 font-normal normal-case">Official Registration Fee</span>
                    </div>
                    <div className="flex justify-between pt-1">
                      <span>Team Registration ({minTeamMembers}+ Members)</span>
                      <span className="text-white font-semibold">₹{registrationPrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-neutral-400">
                      <span>Gateway Convenience Charges</span>
                      <span className="text-emerald-400 font-medium">₹0.00 (Waived)</span>
                    </div>
                    <div className="border-t border-neutral-800 pt-2 flex justify-between text-sm font-bold text-white">
                      <span>Total Payable</span>
                      <span className="text-emerald-400">₹{registrationPrice.toFixed(2)} {currency}</span>
                    </div>
                  </div>

                  <div className="bg-neutral-900/40 border border-neutral-800/80 rounded-xl p-3.5 space-y-2 text-xs">
                    <div className="text-neutral-300 font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Supported Payment Modes via Cashfree:</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-400">
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>UPI (GPay, PhonePe, Paytm)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Cards (Visa, RuPay, Master)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Net Banking (All Indian Banks)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>Instant Auto-Verification</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleCashfreePayment}
                  disabled={isPaying || !hasMinMembers}
                  className="w-full bg-white hover:bg-neutral-200 text-black font-bold py-3.5 h-auto text-base rounded-xl transition duration-200 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPaying ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Connecting to Cashfree...</span>
                    </>
                  ) : (
                    <>
                      <span>Pay ₹{registrationPrice.toFixed(2)} via Cashfree</span>
                    </>
                  )}
                </Button>

                <div className="text-[11px] text-neutral-400 flex items-center justify-center gap-1.5 text-center">
                  <Lock className="w-3 h-3 text-neutral-500" />
                  <span>Secured by Cashfree Payments with Webhook Signature Verification</span>
                </div>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* Footer Note */}
      <footer className="py-4 text-center text-[11px] text-neutral-400 border-t border-neutral-900">
        TransfiNITTe 2025 • Cashfree Payment Gateway Protected
      </footer>
    </div>
  );
};

export default Payment;