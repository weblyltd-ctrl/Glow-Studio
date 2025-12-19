
import React, { useState, useEffect, useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import { Loader2, LogOut, MessageCircle, X, AlertCircle } from "lucide-react";
import { supabase, api } from "./api";
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
  
  // Ref to prevent concurrent sync operations that cause freezes
  const isSyncingRef = useRef(false);

  const syncUserProfile = useCallback(async (user: any) => {
    if (!user || isSyncingRef.current) return;
    
    isSyncingRef.current = true;
    try {
        const profile = await api.fetchUserProfile(user.id);
        
        setState(prev => {
            const name = profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || "";
            const phone = profile?.phone || user.user_metadata?.phone || "";
            
            if (prev.currentUser?.id === user.id && prev.clientName === name && prev.clientPhone === phone) {
                return prev;
            }

            return { 
                ...prev, 
                currentUser: user,
                clientEmail: user.email || "",
                clientName: name,
                clientPhone: phone,
                step: (["welcome", "login", "register", "admin-auth"].includes(prev.step) ? "home" : prev.step) as AppointmentState["step"]
            };
        });

        if (!profile) {
            const metaName = user.user_metadata?.full_name || user.user_metadata?.name || "";
            const metaPhone = user.user_metadata?.phone || "";
            if (metaName && metaPhone) {
                await supabase.from('clients').upsert([{ id: user.id, full_name: metaName, phone: metaPhone, email: user.email }]);
            }
        }
    } catch (e) {
        console.warn("Sync profile failed (might be network/config issue):", e);
    } finally {
        isSyncingRef.current = false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
        // Safe timeout to prevent infinite loading if Supabase is unreachable
        const timeoutId = setTimeout(() => {
            if (mounted && isLoadingSession) {
                console.warn("Auth initialization timed out. Proceeding to welcome screen.");
                setIsLoadingSession(false);
            }
        }, 3500);

        try {
            const { data: { session }, error } = await (supabase.auth as any).getSession();
            if (error) throw error;
            
            if (session?.user && mounted) {
                await syncUserProfile(session.user);
            }
        } catch (e) {
            console.error("Auth init error:", e);
        } finally {
            clearTimeout(timeoutId);
            if (mounted) setIsLoadingSession(false);
        }
    };

    initSession();

    const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && mounted) {
            initSession();
        }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange(async (event: string, session: any) => {
         if (!mounted) return;
         
         if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'TOKEN_REFRESHED') {
             if (session?.user) {
                 await syncUserProfile(session.user);
             }
         } else if (event === 'SIGNED_OUT') {
             setState(prev => ({ 
                 ...prev, 
                 currentUser: null, 
                 step: "welcome", 
                 clientName: "", 
                 clientPhone: "", 
                 clientEmail: "" 
             }));
         }
    });

    return () => {
        mounted = false;
        subscription.unsubscribe();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [syncUserProfile]);

  const resetBookingFlow = () => {
    setState(prev => ({
      ...prev,
      step: prev.currentUser ? "home" : "welcome",
      service: null,
      date: null,
      time: null,
      isWaitingList: false,
      isDemoMode: false
    }));
    setIsSubmitting(false);
    setSubmissionError(null);
  };

  const nextStep = (next: AppointmentState["step"]) => {
    setState(prev => ({ ...prev, step: next }));
  };

  const handleBookingSubmit = async () => {
    setIsSubmitting(true);
    setSubmissionError(null);
    try {
        const result = await api.saveBooking(state);
        if (result.success) {
          if (result.isDemo) setState(prev => ({ ...prev, isDemoMode: true }));
          nextStep(state.isWaitingList ? "waiting-list-confirmed" : "confirmation");
        } else {
          setSubmissionError(result.message || "אירעה שגיאה בשמירת התור.");
        }
    } catch (e) {
        setSubmissionError("שגיאת תקשורת.");
    } finally {
        setIsSubmitting(false);
    }
  };

  if (isLoadingSession) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-[#fcf9f7]">
              <div className="flex flex-col items-center gap-4 animate-pulse">
                <Loader2 className="animate-spin text-black opacity-20" size={32} />
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">טוען סביבה מאובטחת...</span>
              </div>
          </div>
      )
  }

  return (
    <div className="min-h-screen bg-[#fcf9f7] text-slate-900 font-sans pb-20 md:pb-0 relative overflow-x-hidden">
      <div className="relative z-10">
      {!["welcome"].includes(state.step) && (
          <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-md border-b border-slate-100/50">
            <div className="w-full max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3 cursor-pointer" onClick={resetBookingFlow}>
                <div className="logo-ls text-2xl font-medium text-black">LS</div>
                <div className="h-4 w-px bg-slate-200"></div>
                <span className="text-xs font-bold tracking-widest text-slate-900 uppercase">Eyebrow Artist</span>
              </div>
              <div className="flex items-center gap-2">
                 {state.currentUser && (
                    <button onClick={() => api.logout()} className="p-2 text-slate-400 hover:text-red-600 transition">
                         <LogOut size={18} />
                    </button>
                 )}
                 {state.step !== "home" && state.step !== "welcome" && (
                    <button onClick={resetBookingFlow} className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-black transition">חזרה</button>
                 )}
              </div>
            </div>
          </header>
      )}
      <main className="w-full max-w-lg mx-auto px-4 py-8">
        {state.step === "welcome" && <WelcomeScreen onLogin={() => nextStep("login")} onRegister={() => nextStep("register")} onAdminAccess={() => nextStep("admin-auth")} />}
        {state.step === "login" && (
          <ManageLogin 
            onLoginSuccess={() => nextStep("home")} 
            onBack={() => nextStep("welcome")}
            onGoToRegister={() => nextStep("register")}
          />
        )}
        {state.step === "register" && (
          <Register 
            onRegisterSuccess={() => {
              if (state.currentUser) {
                  nextStep("home");
              } else {
                nextStep("login"); 
              }
            }} 
            onBack={() => nextStep("welcome")}
            onGoToLogin={() => nextStep("login")}
          />
        )}
        {state.step === "home" && state.currentUser && (
            <HeroSection 
                userEmail={state.currentUser.email} 
                userName={state.clientName} 
                onStartBooking={() => nextStep("services")} 
                onManageBookings={() => nextStep("manage-list")} 
            />
        )}
        {state.step === "admin-auth" && (
            <AdminAuth 
                onSuccess={() => nextStep("client-registry")} 
                onBack={() => nextStep(state.currentUser ? "home" : "welcome")} 
            />
        )}
        {state.step === "services" && <ServiceSelection services={SERVICES} onSelect={(service) => { setState(prev => ({ ...prev, service })); nextStep("date"); }} onBack={() => nextStep("home")} />}
        {state.step === "date" && (
          <DateSelection 
            service={state.service} 
            selectedDate={state.date} 
            selectedTime={state.time} 
            onDateSelect={(d: Date) => setState(prev => ({ ...prev, date: d, time: null, isWaitingList: false, isDemoMode: false }))} 
            onTimeSelect={(t: string, isWaitingList: boolean) => setState(prev => ({ ...prev, time: t, isWaitingList }))} 
            onNext={handleBookingSubmit} 
            onBack={() => nextStep("services")} 
            isValid={!!state.date && !!state.time}
            isLoading={isSubmitting}
            error={submissionError}
          />
        )}
        {state.step === "confirmation" && <Confirmation state={state} onReset={resetBookingFlow} />}
        {state.step === "waiting-list-confirmed" && <WaitingListConfirmation state={state} onReset={resetBookingFlow} />}
        {state.step === "manage-list" && state.currentUser && <ManageList userId={state.currentUser.id} onBack={() => nextStep("home")} />}
        {state.step === "client-registry" && <ClientRegistry onBack={() => nextStep(state.currentUser ? "home" : "welcome")} />}
      </main>
      {state.currentUser && !["welcome", "login", "register", "confirmation", "waiting-list-confirmed"].includes(state.step) && (
        <div className="fixed bottom-6 left-6 z-50">
          <button onClick={() => setIsChatOpen(!isChatOpen)} className="bg-black text-white p-4 rounded-full shadow-2xl hover:scale-105 transition-transform flex items-center gap-2">
            {isChatOpen ? <X size={24} /> : <MessageCircle size={24} />}
          </button>
        </div>
      )}
      {isChatOpen && <AIConsultant onClose={() => setIsChatOpen(false)} />}
      </div>
    </div>
  );
}

const rootElement = document.getElementById("root");
if (rootElement) { createRoot(rootElement).render(<App />); }
