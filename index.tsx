
import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Loader2, LogOut, MessageCircle, X } from "lucide-react";
import { supabase, api } from "./api";
import { SERVICES } from "./constants";
import { AppointmentState } from "./types";
import { WelcomeScreen, ManageLogin, Register } from "./AuthComponents";
import { HeroSection, ManageList, ClientRegistry } from "./DashboardComponents";
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

  // פונקציה לסנכרון נתוני המשתמש מול מסד הנתונים
  const syncUserProfile = async (user: any) => {
    if (!user) return;
    
    // קודם כל לוקחים מהמטא-דאטה (מהיר)
    let name = user.user_metadata?.full_name || user.user_metadata?.name || "";
    let phone = user.user_metadata?.phone || "";

    // משיכת פרטים מטבלת ה-clients לווידוא שם מלא נכון (למשל עבור יניר)
    const profile = await api.fetchUserProfile(user.id);
    if (profile) {
        name = profile.full_name || name;
        phone = profile.phone || phone;
    }

    setState(prev => ({ 
        ...prev, 
        currentUser: user,
        clientEmail: user.email || "",
        clientName: name,
        clientPhone: phone,
        // אם המשתמש מחובר, הוא לא צריך להיות במסכי הכניסה/הרשמה
        step: ["welcome", "login", "register"].includes(prev.step) ? "home" : prev.step
    }));
  };

  useEffect(() => {
    // טעינת סשן ראשונית
    // Fix: Using any cast to access auth methods due to type resolution issues in this environment
    (supabase.auth as any).getSession().then(({ data: { session } }: any) => {
        if (session?.user) {
            syncUserProfile(session.user);
        }
        setIsLoadingSession(false);
    });

    // האזנה לשינויי התחברות
    // Fix: Using any cast to access auth methods due to type resolution issues in this environment
    const { data: { subscription } } = (supabase.auth as any).onAuthStateChange((_event: any, session: any) => {
         if (session?.user) {
             syncUserProfile(session.user);
         } else {
             setState(prev => ({ ...prev, currentUser: null, step: "welcome", clientName: "", clientPhone: "", clientEmail: "" }));
         }
    });

    return () => subscription.unsubscribe();
  }, []);

  const resetBookingFlow = () => {
    setState(prev => ({
      ...prev,
      step: "home",
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
    const result = await api.saveBooking(state);
    setIsSubmitting(false);
    if (result.success) {
      if (result.isDemo) setState(prev => ({ ...prev, isDemoMode: true }));
      nextStep(state.isWaitingList ? "waiting-list-confirmed" : "confirmation");
    } else {
      setSubmissionError(result.message || "אירעה שגיאה בשמירת הנתונים.");
    }
  };

  if (isLoadingSession) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
              <Loader2 className="animate-spin text-slate-400" size={32} />
          </div>
      )
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-800 font-sans pb-20 md:pb-0 relative overflow-x-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-pink-100/50 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
         <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-slate-100/50 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>
      </div>
      <div className="relative z-10">
      {!["welcome", "login", "register"].includes(state.step) && (
          <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
            <div className="w-full max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 cursor-pointer" onClick={resetBookingFlow}>
                <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white font-bold text-lg">G</div>
                <span className="text-lg font-bold tracking-tight text-slate-900">Glow Studio</span>
              </div>
              <div className="flex items-center gap-2">
                 {state.currentUser && (
                    <button onClick={() => api.logout()} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-red-600 transition bg-transparent px-2 py-2">
                         <LogOut size={14} />
                         <span>יציאה</span>
                    </button>
                 )}
                 {state.step !== "home" && (
                    <button onClick={resetBookingFlow} className="text-sm text-slate-500 hover:text-slate-900 transition font-medium">ביטול</button>
                 )}
              </div>
            </div>
          </header>
      )}
      <main className="w-full max-w-lg mx-auto px-4 py-8">
        {state.step === "welcome" && <WelcomeScreen onLogin={() => nextStep("login")} onRegister={() => nextStep("register")} />}
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
              // אם המערכת מוגדרת לאישור אוטומטי, syncUserProfile כבר יעביר ל-home.
              // אם לא, נציג הודעה ונחזור להתחברות.
              if (!state.currentUser) {
                alert("נרשמת בהצלחה! כעת תוכלי להתחבר."); 
                nextStep("login"); 
              }
            }} 
            onBack={() => nextStep("welcome")}
            onGoToLogin={() => nextStep("login")}
          />
        )}
        {state.step === "home" && state.currentUser && <HeroSection userEmail={state.currentUser.email} userName={state.clientName} onStartBooking={() => nextStep("services")} onManageBookings={() => nextStep("manage-list")} />}
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
        {state.step === "client-registry" && <ClientRegistry onBack={() => nextStep("home")} />}
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
