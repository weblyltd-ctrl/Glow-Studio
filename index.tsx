
import React, { useState, useEffect, useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Loader2, LogOut, MessageCircle, X, AlertCircle } from "lucide-react";
import { supabase, api, checkConfigStatus } from "./api";
import { SERVICES } from "./constants";
import { AppointmentState } from "./types";
import { WelcomeScreen, ManageLogin, Register } from "./AuthComponents";
import { HeroSection, ManageList, ClientRegistry, AdminAuth } from "./DashboardComponents";
import { ServiceSelection, DateSelection, Confirmation, WaitingListConfirmation } from "./BookingComponents";
import { AIConsultant } from "./AIConsultant";

function App() {
  const [state, setState] = useState<AppointmentState>({
    step: "welcome",
    service: null,
    date: null,
    time: null,
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    isWaitingList: false,
    isDemoMode: false,
    currentUser: null
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [showConfigAlert, setShowConfigAlert] = useState(false);
  
  const isSyncingRef = useRef(false);

  const syncUserProfile = useCallback(async (user: any) => {
    if (!user || isSyncingRef.current) return;
    isSyncingRef.current = true;
    try {
        const profile = await api.fetchUserProfile(user.id);
        setState(prev => ({ 
            ...prev, 
            currentUser: user,
            clientEmail: user.email || "",
            clientName: profile?.full_name || user.user_metadata?.full_name || "",
            clientPhone: profile?.phone || user.user_metadata?.phone || "",
            step: (["welcome", "login", "register"].includes(prev.step) ? "home" : prev.step) as AppointmentState["step"]
        }));
    } catch (e) {
        console.error("Profile sync failed:", e);
    } finally {
        isSyncingRef.current = false;
        setIsLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    // מנגנון בטיחות: אם אחרי 5 שניות האתר עדיין בטעינה, נשחרר אותו
    const safetyTimeout = setTimeout(() => {
        if (mounted && isLoadingSession) {
            console.warn("Session loading timed out - forcing app start");
            setIsLoadingSession(false);
            const config = checkConfigStatus();
            if (!config.hasKey || !config.hasUrl) setShowConfigAlert(true);
        }
    }, 5000);

    // קבלת סשן מהיר בטעינה
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (mounted) {
            if (session?.user) {
                syncUserProfile(session.user);
            } else {
                setIsLoadingSession(false);
            }
            clearTimeout(safetyTimeout);
        }
    }).catch(err => {
        console.error("Supabase session error:", err);
        if (mounted) setIsLoadingSession(false);
    });

    // האזנה לשינויי סטטוס (התחברות/התנתקות)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
         if (!mounted) return;
         if (event === 'SIGNED_IN' && session?.user) {
             await syncUserProfile(session.user);
         } else if (event === 'SIGNED_OUT') {
             setState(prev => ({ ...prev, currentUser: null, step: "welcome" }));
         }
    });

    return () => {
        mounted = false;
        subscription.unsubscribe();
        clearTimeout(safetyTimeout);
    };
  }, [syncUserProfile, isLoadingSession]);

  const resetBookingFlow = () => {
    setState(prev => ({
      ...prev,
      step: prev.currentUser ? "home" : "welcome",
      service: null,
      date: null,
      time: null,
      isWaitingList: false
    }));
    setSubmissionError(null);
  };

  const nextStep = (next: AppointmentState["step"]) => setState(prev => ({ ...prev, step: next }));

  const handleBookingSubmit = async () => {
    setIsSubmitting(true);
    setSubmissionError(null);
    try {
        const result = await api.saveBooking(state);
        if (result.success) {
          if (result.isDemo) setState(prev => ({ ...prev, isDemoMode: true }));
          nextStep(state.isWaitingList ? "waiting-list-confirmed" : "confirmation");
        } else {
          setSubmissionError(result.message || "אירעה שגיאה.");
        }
    } catch (e) {
        setSubmissionError("שגיאת תקשורת.");
    } finally {
        setIsSubmitting(false);
    }
  };

  if (isLoadingSession) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-[#fcf9f7] gap-4">
              <Loader2 className="animate-spin text-slate-300" size={40} />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">מתחברת למערכת...</p>
          </div>
      )
  }

  const config = checkConfigStatus();

  return (
    <div className="min-h-screen bg-[#fcf9f7] text-slate-900 font-sans relative overflow-x-hidden">
      {showConfigAlert && (
          <div className="bg-red-600 text-white text-[10px] py-1 text-center font-bold tracking-widest animate-fade-in">
              שימי לב: הגדרות המערכת ב-Vercel לא הושלמו. האתר יעבוד במצב הדגמה בלבד.
          </div>
      )}
      
      {!["welcome"].includes(state.step) && (
          <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
            <div className="w-full max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3 cursor-pointer" onClick={resetBookingFlow}>
                <div className="logo-ls text-2xl font-medium text-black">LS</div>
                <div className="h-4 w-px bg-slate-200"></div>
                <span className="text-[10px] font-bold tracking-widest text-slate-900 uppercase">Eyebrow Artist</span>
              </div>
              <div className="flex items-center gap-4">
                 {state.currentUser && (
                    <button onClick={() => api.logout()} className="text-slate-400 hover:text-red-500 transition"><LogOut size={18} /></button>
                 )}
                 {state.step !== "home" && (
                    <button onClick={resetBookingFlow} className="text-xs font-bold uppercase tracking-widest text-slate-400">חזרה</button>
                 )}
              </div>
            </div>
          </header>
      )}
      <main className="w-full max-w-lg mx-auto px-4 py-8">
        {state.step === "welcome" && <WelcomeScreen onLogin={() => nextStep("login")} onRegister={() => nextStep("register")} onAdminAccess={() => nextStep("admin-auth")} />}
        {state.step === "login" && <ManageLogin onLoginSuccess={() => {}} onBack={() => nextStep("welcome")} onGoToRegister={() => nextStep("register")} />}
        {state.step === "register" && <Register onRegisterSuccess={() => {}} onBack={() => nextStep("welcome")} onGoToLogin={() => nextStep("login")} />}
        {state.step === "home" && state.currentUser && <HeroSection userEmail={state.currentUser.email} userName={state.clientName} onStartBooking={() => nextStep("services")} onManageBookings={() => nextStep("manage-list")} />}
        {state.step === "admin-auth" && <AdminAuth onSuccess={() => nextStep("client-registry")} onBack={() => nextStep(state.currentUser ? "home" : "welcome")} />}
        {state.step === "services" && <ServiceSelection services={SERVICES} onSelect={(s) => { setState(prev => ({ ...prev, service: s })); nextStep("date"); }} onBack={() => nextStep("home")} />}
        {state.step === "date" && <DateSelection service={state.service} selectedDate={state.date} selectedTime={state.time} onDateSelect={(d: any) => setState(prev => ({ ...prev, date: d, time: null }))} onTimeSelect={(t: any, wl: any) => setState(prev => ({ ...prev, time: t, isWaitingList: wl }))} onNext={handleBookingSubmit} onBack={() => nextStep("services")} isValid={!!state.date && !!state.time} isLoading={isSubmitting} error={submissionError} />}
        {state.step === "confirmation" && <Confirmation state={state} onReset={resetBookingFlow} />}
        {state.step === "waiting-list-confirmed" && <WaitingListConfirmation state={state} onReset={resetBookingFlow} />}
        {state.step === "manage-list" && state.currentUser && <ManageList userId={state.currentUser.id} onBack={() => nextStep("home")} />}
        {state.step === "client-registry" && <ClientRegistry onBack={() => nextStep(state.currentUser ? "home" : "welcome")} />}
      </main>
      {state.currentUser && !["welcome", "login", "register"].includes(state.step) && (
        <div className="fixed bottom-6 left-6 z-50">
          <button onClick={() => setIsChatOpen(!isChatOpen)} className="bg-black text-white p-4 rounded-full shadow-2xl hover:scale-105 transition-transform">
            {isChatOpen ? <X size={24} /> : <MessageCircle size={24} />}
          </button>
        </div>
      )}
      {isChatOpen && <AIConsultant onClose={() => setIsChatOpen(false)} />}
    </div>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) { createRoot(rootElement).render(<App />); }
