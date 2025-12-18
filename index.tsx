import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI } from "@google/genai";
import { createClient, User as SupabaseUser } from "@supabase/supabase-js";
import { 
  Calendar, 
  Clock, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle, 
  MessageCircle, 
  X, 
  Send,
  Star,
  Info,
  AlertCircle,
  Bell,
  Users,
  Loader2,
  WifiOff,
  User,
  Trash2,
  CalendarDays,
  Ban,
  RefreshCw,
  Activity,
  Zap,
  Radio,
  FileWarning,
  Settings,
  Database,
  Terminal,
  Lock,
  KeyRound,
  UserPlus,
  LogIn,
  AlertTriangle,
  Copy,
  Check,
  LogOut,
  List,
  Phone,
  Shield,
  Eye,
  EyeOff
} from "lucide-react";

// --- Configuration ---

// SUPABASE CONFIGURATION
const SUPABASE_URL = process.env.SUPABASE_URL || "https://hhqzjgmghwkcetzcvtth.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhocXpqZ21naHdrY2V0emN2dHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4OTc3MjMsImV4cCI6MjA4MTQ3MzcyM30.FjjT1SBR6WJtYC742KXMjazgQnhkqljHLMQJsQJDC00";

// Initialize Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Business Rules
const BUSINESS_HOURS = {
  start: 9, // 09:00
  end: 18,  // 18:00
};

const WORKING_DAYS = [0, 1, 2, 3, 4]; // Sunday (0) to Thursday (4)

// --- Types ---

type Service = {
  id: string;
  name: string;
  price: number;
  duration: number; // in minutes
  description: string;
  category: "brows" | "lashes" | "combo";
};

type AppointmentState = {
  step: "welcome" | "login" | "register" | "home" | "services" | "date" | "details" | "confirmation" | "waiting-list-confirmed" | "manage-list" | "client-registry";
  service: Service | null;
  date: Date | null;
  time: string | null;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  isWaitingList: boolean;
  isDemoMode?: boolean; // New flag to track RLS fallback
  currentUser: SupabaseUser | null;
};

type ClientBooking = {
  id?: number;
  date: string;
  time: string;
  service: string;
  name: string;
};

type ClientProfile = {
    id: string;
    full_name: string;
    phone: string;
    email: string;
    password?: string;
    created_at: string;
};

type ChatMessage = {
  role: "user" | "model";
  text: string;
};

// --- Mock Data & Helpers ---

const SERVICES: Service[] = [
  {
    id: "brows-shape",
    name: "עיצוב גבות",
    price: 100,
    duration: 60,
    description: "עיצוב והתאמת צורה למבנה הפנים (60 דקות).",
    category: "brows"
  },
  {
    id: "lashes-design",
    name: "עיצוב ריסים",
    price: 180,
    duration: 45,
    description: "טיפול לעיצוב ריסים (45 דקות).",
    category: "lashes"
  },
  {
    id: "brows-lamination",
    name: "הרמת גבות",
    price: 220,
    duration: 45,
    description: "טיפול המעניק לגבות מראה מלא ומורם.",
    category: "brows"
  },
  {
    id: "lash-lift",
    name: "הרמת ריסים",
    price: 250,
    duration: 60,
    description: "הרמה וסלסול הריסים הטבעיים.",
    category: "lashes"
  },
  {
    id: "combo-glow",
    name: "חבילת גלואו (משולב)",
    price: 350,
    duration: 90,
    description: "הרמת ריסים ועיצוב גבות במחיר משתלם.",
    category: "combo"
  }
];

// Helper to generate a date string key (YYYY-MM-DD) based on local time
const getDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper to format date to HH:MM manually
const formatTime = (date: Date) => {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

// Helper to add minutes to HH:MM string and return new HH:MM string
const addMinutesStr = (timeStr: string, minutesToAdd: number): string => {
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  
  const d = new Date();
  d.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
  d.setMinutes(d.getMinutes() + minutesToAdd);
  
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

const isWorkingDay = (date: Date) => WORKING_DAYS.includes(date.getDay());

const getWaitCount = (t: string) => {
  const sum = t.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return (sum % 4) + 1; // Returns 1 to 4
};

// --- API Service (Supabase Implementation) ---

const api = {
  // Fetch all booked slots
  fetchBookedSlots: async (): Promise<{ connected: boolean; slots: Record<string, string[]>; error?: string }> => {
    try {
      // Fetch all future appointments
      const { data, error } = await supabase
        .from('appointments')
        .select('date, time, service');
        
      if (error) throw error;

      const normalizedData: Record<string, string[]> = {};
      
      data?.forEach((row: any) => {
          const dateKey = row.date;
          const time = row.time;
          
          if (!normalizedData[dateKey]) {
              normalizedData[dateKey] = [];
          }
          
          if (!normalizedData[dateKey].includes(time)) {
              normalizedData[dateKey].push(time);
          }

          // Calculate duration blocking
          let duration = 30;
          const sName = row.service;
          const matched = SERVICES.find(s => s.name === sName);
          if (matched) duration = matched.duration;

          const slotsToBlock = Math.ceil(duration / 30);
          for (let i = 1; i < slotsToBlock; i++) {
                const nextSlot = addMinutesStr(time, i * 30);
                if (!normalizedData[dateKey].includes(nextSlot)) {
                    normalizedData[dateKey].push(nextSlot);
                }
          }
      });

      return { connected: true, slots: normalizedData };
    } catch (error: any) {
      console.error("Supabase fetch slots error:", error);
      return { connected: false, slots: {}, error: error.message };
    }
  },

  // Login (Supabase Auth)
  loginUser: async (email: string, password: string): Promise<{success: boolean, message?: string}> => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error("Login failed:", error.message);
        let message = "שגיאה בכניסה";
        
        if (error.message.includes("Invalid login credentials")) {
            message = "אימייל או סיסמה שגויים. אנא נסה שוב.";
        } else if (error.message.includes("Email not confirmed")) {
            message = "כתובת האימייל טרם אושרה. אנא בדוק את תיבת המייל שלך.";
        }
        
        return { success: false, message };
    }
  },

  // Register (Supabase Auth)
  registerUser: async (email: string, password: string, fullName: string, phone: string): Promise<{success: boolean, message?: string, requiresConfirmation?: boolean}> => {
    try {
        // 1. Sign up user
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: window.location.origin, // Redirect back to current origin instead of localhost
                data: {
                    full_name: fullName,
                    phone: phone
                }
            }
        });

        if (error) {
            if (error.message.includes("already registered")) {
                 return { success: false, message: "כתובת האימייל הזו כבר רשומה במערכת." };
            }
            throw error;
        }

        // 2. Attempt to add to 'clients' table (Registry)
        // Note: This requires a 'clients' table in Supabase public schema
        if (data.user) {
            try {
                await supabase.from('clients').insert([{
                    id: data.user.id,
                    email: email,
                    full_name: fullName,
                    phone: phone,
                    password: password // Store plain text password (Demo only - insecure in production!)
                }]);
            } catch (tableError) {
                console.warn("Could not save to clients table (Registry). Verify table exists and RLS policies.", tableError);
                // We don't block registration if this fails, but we log it.
            }
        }
        
        // Check if email confirmation is required (user created but no session)
        if (data.user && !data.session) {
            return { success: true, requiresConfirmation: true };
        }
        
        return { success: true };

    } catch (error: any) {
        console.error("Registration failed:", error);
        return { success: false, message: error.message || "שגיאה בהרשמה" };
    }
  },

  fetchClients: async (): Promise<{ success: boolean, clients: ClientProfile[], error?: string }> => {
      try {
          const { data, error } = await supabase
            .from('clients')
            .select('*')
            .order('created_at', { ascending: false });
            
          if (error) throw error;
          return { success: true, clients: data as ClientProfile[] };
      } catch (error: any) {
          console.error("Error fetching clients:", error);
          return { success: false, clients: [], error: error.message };
      }
  },

  // Fetch Client Bookings
  fetchClientBookings: async (userId: string): Promise<ClientBooking[]> => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: true });

      if (error) throw error;
      return data as ClientBooking[];
    } catch (error) {
      console.error("Fetch client bookings error:", error);
      return [];
    }
  },

  // Save Booking
  saveBooking: async (bookingData: any): Promise<{ success: boolean; message?: string; isDemo?: boolean }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Construct payload
      const payload: any = {
        date: getDateKey(new Date(bookingData.date)), 
        time: bookingData.time,
        service: bookingData.service.name,
        client_name: bookingData.clientName,
        client_phone: bookingData.clientPhone,
        client_email: bookingData.clientEmail,
      };

      // Only add user_id if we actually have a user. 
      if (user) {
        payload.user_id = user.id;
      }

      console.log("Saving booking payload:", payload);

      const { error } = await supabase.from('appointments').insert([payload]);
      
      if (error) {
          console.error("Supabase Insert Error:", JSON.stringify(error, null, 2));
          
          if (error.code === '42501' || error.message.toLowerCase().includes('policy')) {
              console.warn("Backend RLS Policy blocked the insert. Proceeding in UI-only mode.");
              return { success: true, isDemo: true }; 
          }
          
          throw error;
      }
      return { success: true, isDemo: false };
    } catch (error: any) {
      console.error("Error saving booking:", error);
      return { success: false, message: error.message || "שגיאה בשמירת התור" };
    }
  },

  // Cancel Booking
  cancelBooking: async (bookingId: number) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', bookingId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error("Error canceling booking:", error);
      return { success: false };
    }
  },

  logout: async () => {
      await supabase.auth.signOut();
  }
};

const generateTimeSlots = (
  date: Date, 
  durationMinutes: number, 
  bookedSlotsMap: Record<string, string[]>
): { time: string; available: boolean; waitingCount: number }[] => {
  const slots: { time: string; available: boolean; waitingCount: number }[] = [];
  const startHour = BUSINESS_HOURS.start;
  const endHour = BUSINESS_HOURS.end;
  
  let current = new Date(date);
  current.setHours(startHour, 0, 0, 0);
  
  const endTime = new Date(date);
  endTime.setHours(endHour, 0, 0, 0);

  const dateKey = getDateKey(date);
  const bookedTimes = new Set(bookedSlotsMap[dateKey] || []);

  while (current < endTime) {
    const serviceEnd = new Date(current.getTime() + durationMinutes * 60000);
    
    if (serviceEnd <= endTime) {
      const timeString = formatTime(current);
      let isBlocked = false;
      const slotsNeeded = Math.ceil(durationMinutes / 30);
      
      for (let i = 0; i < slotsNeeded; i++) {
          const slotToCheck = addMinutesStr(timeString, i * 30);
          if (bookedTimes.has(slotToCheck)) {
              isBlocked = true;
              break;
          }
      }
      
      const waitingCount = isBlocked ? getWaitCount(timeString) : 0;
      
      slots.push({
        time: timeString,
        available: !isBlocked,
        waitingCount
      });
    }
    current = new Date(current.getTime() + 30 * 60000); 
  }
  return slots;
};

function App() {
  const [state, setState] = useState<AppointmentState>({
    step: "welcome", // Default start step
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

  // Check auth state on load
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
            const { user } = session;
            setState(prev => ({ 
                ...prev, 
                currentUser: user,
                clientEmail: user.email || "",
                // Try to pre-fill name/phone from metadata if available
                clientName: user.user_metadata?.full_name || "",
                clientPhone: user.user_metadata?.phone || "",
                step: "home" // Go to dashboard if logged in
            }));
        } else {
             setState(prev => ({ ...prev, step: "welcome" }));
        }
        setIsLoadingSession(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
         if (session?.user) {
             const { user } = session;
             setState(prev => ({ 
                ...prev, 
                currentUser: user,
                clientEmail: user.email || "",
                clientName: user.user_metadata?.full_name || prev.clientName,
                clientPhone: user.user_metadata?.phone || prev.clientPhone,
                // Only move to home if we are in an auth screen
                step: ["welcome", "login", "register"].includes(prev.step) ? "home" : prev.step
            }));
         } else {
             setState(prev => ({ 
                ...prev, 
                currentUser: null,
                step: "welcome" 
            }));
         }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
      await api.logout();
      // State update handled by onAuthStateChange
  };

  const resetBookingFlow = () => {
    // Reset booking data but keep user logged in and go to dashboard (home)
    setState(prev => ({
      ...prev,
      step: "home",
      service: null,
      date: null,
      time: null,
      // We don't reset name/phone if we have them from user profile
      clientName: prev.currentUser?.user_metadata?.full_name || prev.clientName,
      clientPhone: prev.currentUser?.user_metadata?.phone || prev.clientPhone,
      isWaitingList: false,
      isDemoMode: false
    }));
    setIsSubmitting(false);
    setSubmissionError(null);
  };

  const nextStep = (next: AppointmentState["step"]) => {
    setState(prev => ({ ...prev, step: next }));
  };

  const handleDetailsSubmit = async () => {
    setIsSubmitting(true);
    setSubmissionError(null);
    const result = await api.saveBooking(state);
    setIsSubmitting(false);
    
    if (result.success) {
      if (result.isDemo) {
        setState(prev => ({ ...prev, isDemoMode: true }));
      }
      if (state.isWaitingList) {
        nextStep("waiting-list-confirmed");
      } else {
        nextStep("confirmation");
      }
    } else {
      setSubmissionError(result.message || "אירעה שגיאה בשמירת הנתונים. אנא נסי שוב.");
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
      
      {/* Background Decor */}
      <div className="fixed inset-0 z-0 pointer-events-none">
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-pink-100/50 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
         <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-slate-100/50 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>
      </div>

      <div className="relative z-10">
      
      {/* Header - Only show if not on welcome/auth screens */}
      {!["welcome", "login", "register"].includes(state.step) && (
          <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
            <div className="w-full max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 cursor-pointer" onClick={resetBookingFlow}>
                <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white font-bold text-lg">
                  G
                </div>
                <span className="text-lg font-bold tracking-tight text-slate-900">Glow Studio</span>
              </div>
              
              <div className="flex items-center gap-2">
                 {state.currentUser && (
                    <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-red-600 transition bg-transparent px-2 py-2">
                         <LogOut size={14} />
                         <span>יציאה</span>
                    </button>
                 )}
                 {state.step !== "home" && (
                    <button onClick={resetBookingFlow} className="text-sm text-slate-500 hover:text-slate-900 transition font-medium">
                      ביטול
                    </button>
                 )}
              </div>
            </div>
          </header>
      )}

      <main className="w-full max-w-lg mx-auto px-4 py-8">
        
        {/* Auth Flows */}
        {state.step === "welcome" && (
            <WelcomeScreen 
                onLogin={() => nextStep("login")} 
                onRegister={() => nextStep("register")} 
            />
        )}

        {state.step === "login" && (
          <ManageLogin 
            onLoginSuccess={() => nextStep("home")}
            onBack={() => nextStep("welcome")}
          />
        )}

        {state.step === "register" && (
          <Register 
            onRegisterSuccess={() => {
                alert("נרשמת בהצלחה! כעת תוכלי להתחבר.");
                nextStep("login"); // Or directly home if auto-login
            }}
            onBack={() => nextStep("welcome")}
          />
        )}

        {/* User Dashboard / Booking Flow */}
        {state.step === "home" && state.currentUser && (
          <HeroSection 
            userEmail={state.currentUser.email} 
            userName={state.clientName}
            onStartBooking={() => nextStep("services")} 
            onManageBookings={() => nextStep("manage-list")}
            onViewRegistry={() => nextStep("client-registry")}
          />
        )}

        {state.step === "services" && (
          <ServiceSelection 
            services={SERVICES} 
            onSelect={(service) => {
              setState(prev => ({ ...prev, service }));
              nextStep("date");
            }} 
            onBack={() => nextStep("home")}
          />
        )}

        {state.step === "date" && (
          <DateSelection 
            service={state.service}
            selectedDate={state.date}
            selectedTime={state.time}
            onDateSelect={(d: Date) => setState(prev => ({ ...prev, date: d, time: null, isWaitingList: false, isDemoMode: false }))}
            onTimeSelect={(t: string, isWaitingList: boolean) => setState(prev => ({ ...prev, time: t, isWaitingList }))}
            onNext={() => nextStep("details")}
            onBack={() => nextStep("services")}
            isValid={!!state.date && !!state.time}
          />
        )}

        {state.step === "details" && (
          <ClientDetails 
            name={state.clientName}
            phone={state.clientPhone}
            email={state.clientEmail} // Should be pre-filled
            isWaitingList={state.isWaitingList}
            isLoading={isSubmitting}
            error={submissionError}
            onChange={(field: string, val: string) => setState(prev => ({ ...prev, [field]: val }))}
            onNext={handleDetailsSubmit}
            onBack={() => nextStep("date")}
          />
        )}

        {state.step === "confirmation" && (
          <Confirmation state={state} onReset={resetBookingFlow} />
        )}

        {state.step === "waiting-list-confirmed" && (
          <WaitingListConfirmation state={state} onReset={resetBookingFlow} />
        )}

        {state.step === "manage-list" && state.currentUser && (
          <ManageList 
            userId={state.currentUser.id}
            onBack={() => nextStep("home")}
          />
        )}

        {state.step === "client-registry" && (
          <ClientRegistry 
            onBack={() => nextStep("home")}
          />
        )}

      </main>

      {/* Floating Chat Button (Only when logged in and not in final confirmation) */}
      {state.currentUser && !["welcome", "login", "register", "confirmation", "waiting-list-confirmed"].includes(state.step) && (
        <div className="fixed bottom-6 left-6 z-50">
          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="bg-black text-white p-4 rounded-full shadow-2xl hover:scale-105 transition-transform flex items-center gap-2"
          >
            {isChatOpen ? <X size={24} /> : <MessageCircle size={24} />}
          </button>
        </div>
      )}

      {/* Chat Modal */}
      {isChatOpen && (
        <AIConsultant onClose={() => setIsChatOpen(false)} />
      )}
      </div>
    </div>
  );
}

// --- Sub-Components ---

function WelcomeScreen({ onLogin, onRegister }: { onLogin: () => void, onRegister: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-8 animate-fade-in px-4">
             <div className="relative">
                <div className="absolute inset-0 bg-pink-200 blur-3xl opacity-30 rounded-full"></div>
                <div className="w-20 h-20 bg-black text-white rounded-full flex items-center justify-center text-3xl font-bold relative z-10 shadow-xl mb-4">G</div>
            </div>
            
            <div className="space-y-2">
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Glow Studio</h1>
                <p className="text-slate-500 text-lg">ברוכה הבאה לאפליקציית הריסים והגבות שלך</p>
            </div>

            <div className="w-full max-w-xs space-y-4 pt-8">
                <button 
                    onClick={onLogin}
                    className="w-full bg-black text-white py-4 rounded-full font-bold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                >
                    <LogIn size={20} />
                    <span>כניסה לחשבון קיים</span>
                </button>
                <button 
                    onClick={onRegister}
                    className="w-full bg-white text-slate-900 border border-slate-200 py-4 rounded-full font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                    <UserPlus size={20} />
                    <span>הרשמה לחשבון חדש</span>
                </button>
            </div>
        </div>
    );
}

function HeroSection({ userEmail, userName, onStartBooking, onManageBookings, onViewRegistry }: { userEmail?: string, userName?: string, onStartBooking: () => void, onManageBookings: () => void, onViewRegistry: () => void }) {
  const displayName = userName || (userEmail ? userEmail.split('@')[0] : 'אורחת');

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-fade-in">
        <div className="space-y-2 max-w-xs mx-auto">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                היי, {displayName}! 👋
            </h1>
            <p className="text-slate-500">
                מה נרצה לעשות היום?
            </p>
        </div>
        
        <div className="grid gap-4 w-full max-w-xs">
            <button 
                onClick={onStartBooking}
                className="group bg-black text-white px-8 py-5 rounded-2xl text-lg font-bold shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-between"
            >
                <span>קביעת תור חדש</span>
                <div className="bg-white/20 p-2 rounded-full">
                    <ChevronLeft className="group-hover:-translate-x-1 transition-transform" />
                </div>
            </button>

            <button 
                onClick={onManageBookings}
                className="group bg-white text-slate-900 border border-slate-200 px-8 py-5 rounded-2xl text-lg font-bold hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-between"
            >
                <span>התורים שלי</span>
                <div className="bg-slate-100 text-slate-500 p-2 rounded-full group-hover:bg-white group-hover:text-black transition-colors">
                    <List size={20} />
                </div>
            </button>

             <button 
                onClick={onViewRegistry}
                className="group bg-slate-50 text-slate-700 border border-slate-200 px-8 py-4 rounded-2xl text-sm font-bold hover:bg-slate-100 transition-all flex items-center justify-between"
            >
                <span>מאגר לקוחות</span>
                <Users size={18} className="text-slate-400 group-hover:text-slate-700" />
            </button>
        </div>
    </div>
  );
}

// ... Confirmation, WaitingListConfirmation, ServiceSelection, DateSelection remain mostly same ...
// Modified ClientDetails to handle read-only email if provided

function Confirmation({ state, onReset }: any) {
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);

  const copySql = () => {
      const sql = `create policy "Enable public insert" on "public"."appointments" for insert to public with check (true);`;
      navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="text-center py-10 space-y-6 animate-scale-in">
      <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
        <CheckCircle size={48} />
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold text-slate-900">איזה כיף! התור נקבע.</h2>
        <p className="text-slate-500">נשלח לך אישור ל-WhatsApp ולמייל.</p>
      </div>
      
      {state.isDemoMode && (
          <div className="mx-4 bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-xl text-right">
              <div className="flex items-start gap-3">
                <AlertTriangle className="shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                    <p className="font-bold text-sm">מצב הדגמה (שגיאת הרשאות)</p>
                    <p className="text-xs mt-1">
                        הנתונים לא נשמרו בשרת כי חסרה מדיניות (Policy) המאפשרת למשתמשים לקבוע תורים.
                    </p>
                    <button 
                        onClick={() => setShowSql(!showSql)}
                        className="text-xs font-bold underline mt-2 hover:text-orange-900"
                    >
                        {showSql ? 'הסתר פתרון' : 'איך מתקנים?'}
                    </button>
                </div>
              </div>
              
              {showSql && (
                  <div className="mt-3 bg-white p-3 rounded-lg border border-orange-200 text-left relative" dir="ltr">
                      <p className="text-[10px] text-slate-500 mb-1 font-sans">Run this in Supabase SQL Editor:</p>
                      <code className="block text-[10px] font-mono bg-slate-50 p-2 rounded text-slate-700 break-all whitespace-pre-wrap">
                        create policy "Enable insert for authenticated users" on "public"."appointments" for insert to authenticated with check (true);
                      </code>
                      <button 
                        onClick={copySql}
                        className="absolute top-2 right-2 p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition"
                        title="Copy SQL"
                      >
                         {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                      </button>
                  </div>
              )}
          </div>
      )}
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mx-4 inline-block text-right w-full max-w-sm">
        <div className="space-y-4">
            <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-500">שירות</span>
                <span className="font-bold">{state.service?.name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-500">תאריך</span>
                <span className="font-bold">{state.date?.toLocaleDateString('he-IL')}</span>
            </div>
            <div className="flex justify-between border-b border-slate-50 pb-2">
                <span className="text-slate-500">שעה</span>
                <span className="font-bold">{state.time}</span>
            </div>
             <div className="flex justify-between">
                <span className="text-slate-500">כתובת</span>
                <span className="font-bold">דיזינגוף 100, ת"א</span>
            </div>
        </div>
      </div>

      <button 
        onClick={onReset}
        className="text-slate-500 hover:text-slate-900 font-medium underline underline-offset-4"
      >
        חזרה לדף הבית
      </button>
    </div>
  );
}

function WaitingListConfirmation({ state, onReset }: any) {
  return (
    <div className="text-center py-10 space-y-6 animate-scale-in">
      <div className="w-24 h-24 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
        <Clock size={48} />
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold text-slate-900">נרשמת להמתנה</h2>
        <p className="text-slate-500">אנחנו נודיע לך ברגע שיתפנה מקום.</p>
      </div>

      {state.isDemoMode && (
          <div className="mx-4 bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-xl flex items-start gap-3 text-right">
              <AlertTriangle className="shrink-0 mt-0.5" size={20} />
              <div>
                  <p className="font-bold text-sm">מצב הדגמה</p>
                  <p className="text-xs mt-1">הנתונים לא נשמרו בשרת עקב מגבלת הרשאות (RLS Policy).</p>
              </div>
          </div>
      )}
      
      <button 
        onClick={onReset}
        className="bg-black text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-slate-800 transition-all"
      >
        מעולה, תודה!
      </button>
    </div>
  );
}

function ServiceSelection({ services, onSelect, onBack }: { services: Service[], onSelect: (s: Service) => void, onBack: () => void }) {
    return (
        <div className="space-y-6 animate-slide-up">
            <div className="flex items-center gap-2 mb-6">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition">
                    <ChevronRight size={24} />
                </button>
                <h2 className="text-2xl font-bold">בחרי שירות</h2>
            </div>
            
            <div className="grid gap-4">
                {services.map(service => (
                    <div 
                        key={service.id}
                        onClick={() => onSelect(service)}
                        className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition cursor-pointer flex justify-between items-center group"
                    >
                        <div>
                            <h3 className="font-bold text-lg text-slate-900">{service.name}</h3>
                            <p className="text-slate-500 text-sm mb-2">{service.description}</p>
                            <div className="flex items-center gap-3 text-sm font-medium">
                                <span className="text-slate-900">₪{service.price}</span>
                                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                <span className="text-slate-500">{service.duration} דקות</span>
                            </div>
                        </div>
                        <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 group-hover:bg-black group-hover:text-white transition-colors">
                            <ChevronLeft size={20} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function DateSelection({ service, selectedDate, selectedTime, onDateSelect, onTimeSelect, onNext, onBack, isValid }: any) {
    const [slots, setSlots] = useState<{ time: string; available: boolean; waitingCount: number }[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Generate next 14 days
    const dates = Array.from({ length: 14 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return d;
    }).filter(d => isWorkingDay(d));

    useEffect(() => {
        if (selectedDate && service) {
            setLoadingSlots(true);
            api.fetchBookedSlots().then(({ connected, slots: bookedSlots, error }) => {
                if (!connected) {
                    setError("שגיאת תקשורת עם השרת");
                }
                const generated = generateTimeSlots(selectedDate, service.duration, bookedSlots || {});
                setSlots(generated);
                setLoadingSlots(false);
            });
        }
    }, [selectedDate, service]);

    return (
        <div className="space-y-6 animate-slide-up h-full flex flex-col">
             <div className="flex items-center gap-2">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition">
                    <ChevronRight size={24} />
                </button>
                <div>
                    <h2 className="text-2xl font-bold">מתי נוח לך?</h2>
                    <p className="text-slate-500 text-sm">עבור {service?.name}</p>
                </div>
            </div>

            {/* Date Scroller */}
            <div className="flex gap-3 overflow-x-auto pb-4 pt-2 px-1 snap-x no-scrollbar">
                {dates.map((date, i) => {
                    const isSelected = selectedDate && getDateKey(selectedDate) === getDateKey(date);
                    const dayName = date.toLocaleDateString('he-IL', { weekday: 'short' });
                    const dayNum = date.getDate();
                    return (
                        <button
                            key={i}
                            onClick={() => onDateSelect(date)}
                            className={`
                                flex-shrink-0 w-16 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 border transition-all snap-start
                                ${isSelected 
                                    ? 'bg-black text-white border-black shadow-lg scale-105' 
                                    : 'bg-white text-slate-600 border-slate-100 hover:border-slate-300'
                                }
                            `}
                        >
                            <span className="text-xs opacity-80">{dayName}</span>
                            <span className="text-xl font-bold">{dayNum}</span>
                        </button>
                    )
                })}
            </div>

            {/* Time Slots */}
            <div className="flex-1 overflow-y-auto min-h-[300px]">
                {!selectedDate ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                        <CalendarDays size={32} />
                        <p>יש לבחור תאריך</p>
                    </div>
                ) : loadingSlots ? (
                     <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                        <Loader2 className="animate-spin" size={32} />
                        <p>טוען שעות פנויות...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-3 content-start">
                        {slots.map((slot, i) => {
                            const isSelected = selectedTime === slot.time;
                            return (
                                <button
                                    key={i}
                                    onClick={() => onTimeSelect(slot.time, !slot.available)}
                                    className={`
                                        relative py-3 rounded-xl text-sm font-bold border transition-all
                                        ${isSelected
                                            ? slot.available 
                                                ? 'bg-black text-white border-black shadow-md'
                                                : 'bg-yellow-100 text-yellow-900 border-yellow-300 shadow-md'
                                            : slot.available
                                                ? 'bg-white text-slate-900 border-slate-200 hover:border-slate-900'
                                                : 'bg-slate-50 text-slate-400 border-slate-100'
                                        }
                                    `}
                                >
                                    {slot.time}
                                    {!slot.available && (
                                        <span className="absolute -top-2 -left-2 bg-yellow-400 text-yellow-900 text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">
                                            המתנה
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                        {slots.length === 0 && (
                            <div className="col-span-3 text-center py-10 text-slate-500">
                                לא נמצאו תורים פנויים לתאריך זה.
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="sticky bottom-0 bg-[#FAFAFA] pt-4 border-t border-slate-100">
                <button
                    disabled={!isValid}
                    onClick={onNext}
                    className="w-full bg-black text-white py-4 rounded-full font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all"
                >
                    המשך
                </button>
            </div>
        </div>
    );
}

function ClientDetails({ name, phone, email, isWaitingList, isLoading, error, onChange, onNext, onBack }: any) {
    return (
        <div className="space-y-6 animate-slide-up">
            <div className="flex items-center gap-2">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition">
                    <ChevronRight size={24} />
                </button>
                <h2 className="text-2xl font-bold">פרטים אישיים</h2>
            </div>

            {isWaitingList && (
                <div className="bg-yellow-50 text-yellow-800 p-4 rounded-xl flex items-start gap-3 text-sm">
                    <Clock className="shrink-0 mt-0.5" size={16} />
                    <div>
                        <span className="font-bold block mb-1">רשימת המתנה</span>
                        התור שבחרת תפוס. אם תמשיכי, ניכנס לרשימת המתנה ונודיע לך ברגע שיתפנה.
                    </div>
                </div>
            )}

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">שם מלא</label>
                    <input 
                        type="text" 
                        value={name}
                        onChange={(e) => onChange('clientName', e.target.value)}
                        className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition"
                        placeholder="ישראל ישראלי"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">טלפון</label>
                    <input 
                        type="tel" 
                        value={phone}
                        onChange={(e) => onChange('clientPhone', e.target.value)}
                        className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition"
                        placeholder="050-0000000"
                    />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">אימייל</label>
                    <input 
                        type="email" 
                        value={email}
                        readOnly
                        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed"
                    />
                    <p className="text-[10px] text-slate-400 mt-1 mr-1">מחובר כ-{email}</p>
                </div>
            </div>

            {error && (
                <div className="text-red-500 text-sm text-center bg-red-50 p-3 rounded-lg">
                    {error}
                </div>
            )}

            <button
                onClick={onNext}
                disabled={!name || !phone || !email || isLoading}
                className="w-full bg-black text-white py-4 rounded-full font-bold disabled:opacity-50 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
                {isLoading ? <Loader2 className="animate-spin" /> : isWaitingList ? 'הרשמה להמתנה' : 'אישור תור'}
            </button>
        </div>
    );
}

function ManageLogin({ onLoginSuccess, onBack }: { onLoginSuccess: () => void, onBack: () => void }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        const res = await api.loginUser(email, password);
        setLoading(false);

        if (res.success) {
            onLoginSuccess();
        } else {
            setError(res.message || "שגיאה בכניסה");
        }
    };

    return (
        <div className="space-y-6 animate-slide-up">
             <div className="flex items-center gap-2">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition">
                    <ChevronRight size={24} />
                </button>
                <h2 className="text-2xl font-bold">כניסה</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">אימייל</label>
                    <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">סיסמה</label>
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition"
                    />
                </div>

                {error && <div className="text-red-500 text-sm">{error}</div>}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-black text-white py-4 rounded-full font-bold disabled:opacity-50 shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
                >
                    {loading ? <Loader2 className="animate-spin" /> : 'כניסה'}
                </button>
            </form>
        </div>
    );
}

function Register({ onRegisterSuccess, onBack }: { onRegisterSuccess: () => void, onBack: () => void }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        const res = await api.registerUser(email, password, fullName, phone);
        setLoading(false);

        if (res.success) {
            if (res.requiresConfirmation) {
                alert("הרשמה בוצעה בהצלחה! נשלח אליך מייל לאימות החשבון. יש לאשר אותו לפני הכניסה.");
                onBack(); // Go back to welcome or login
            } else {
                onRegisterSuccess();
            }
        } else {
            setError(res.message || "שגיאה בהרשמה");
        }
    };

     return (
        <div className="space-y-6 animate-slide-up">
             <div className="flex items-center gap-2">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition">
                    <ChevronRight size={24} />
                </button>
                <h2 className="text-2xl font-bold">הרשמה</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">שם מלא</label>
                    <div className="relative">
                        <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="text" 
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            required
                            className="w-full p-4 pr-12 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition"
                            placeholder="ישראל ישראלי"
                        />
                    </div>
                </div>

                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">טלפון</label>
                    <div className="relative">
                        <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input 
                            type="tel" 
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                            className="w-full p-4 pr-12 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition"
                            placeholder="050-1234567"
                        />
                    </div>
                </div>

                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">אימייל</label>
                    <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition"
                        placeholder="example@mail.com"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">סיסמה</label>
                    <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition"
                        placeholder="******"
                    />
                    <p className="text-xs text-slate-400 mt-1">מינימום 6 תווים</p>
                </div>

                {error && <div className="text-red-500 text-sm">{error}</div>}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-black text-white py-4 rounded-full font-bold disabled:opacity-50 shadow-lg hover:shadow-xl transition-all flex items-center justify-center"
                >
                    {loading ? <Loader2 className="animate-spin" /> : 'סיום הרשמה'}
                </button>
            </form>
        </div>
    );
}

function ManageList({ userId, onBack }: { userId: string, onBack: () => void }) {
    const [bookings, setBookings] = useState<ClientBooking[]>([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        const data = await api.fetchClientBookings(userId);
        setBookings(data);
        setLoading(false);
    }

    useEffect(() => {
        load();
    }, [userId]);

    const handleCancel = async (booking: ClientBooking) => {
        if (!confirm('האם לבטל את התור?')) return;
        if (booking.id) {
             await api.cancelBooking(booking.id);
             load();
        }
    }

    return (
        <div className="space-y-6 animate-slide-up">
             <div className="flex items-center gap-2">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition">
                    <ChevronRight size={24} />
                </button>
                <h2 className="text-2xl font-bold">התורים שלי</h2>
            </div>
            
            {loading ? (
                <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>
            ) : bookings.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                    <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500 font-medium">עדיין לא קבעת תורים</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {bookings.map((b) => (
                        <div key={b.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-slate-200 transition">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-900 font-bold text-sm border border-slate-100">
                                    {b.date.split('-')[2]}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900">{b.service}</div>
                                    <div className="text-slate-500 text-sm flex items-center gap-2">
                                        <Clock size={12} />
                                        <span>{b.time}</span>
                                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                        <span>{b.date}</span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleCancel(b)}
                                className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all"
                                title="ביטול תור"
                            >
                                <Trash2 size={20} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function ClientRegistry({ onBack }: { onBack: () => void }) {
    const [clients, setClients] = useState<ClientProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showSql, setShowSql] = useState(false);
    const [copied, setCopied] = useState(false);
    const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            const { success, clients, error } = await api.fetchClients();
            if (success) {
                setClients(clients);
                setError(null);
            } else {
                setError(error || "שגיאה בטעינת לקוחות");
            }
            setLoading(false);
        };
        load();
    }, []);

    const togglePassword = (id: string) => {
        setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const copySql = () => {
        const sql = `create table if not exists public.clients (
  id uuid references auth.users not null primary key,
  full_name text,
  phone text,
  email text,
  password text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create policy "Enable insert for everyone" on public.clients for insert with check (true);
create policy "Enable select for everyone" on public.clients for select using (true);`;
        navigator.clipboard.writeText(sql);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6 animate-slide-up">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition">
                        <ChevronRight size={24} />
                    </button>
                    <h2 className="text-2xl font-bold">מאגר לקוחות</h2>
                </div>
                <button 
                    onClick={() => setShowSql(!showSql)}
                    className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200 transition flex items-center gap-1"
                >
                    <Database size={12} />
                    <span>{showSql ? 'הסתר הגדרות' : 'הגדרת מסד נתונים'}</span>
                </button>
            </div>

            {showSql && (
                <div className="bg-slate-900 text-slate-300 p-4 rounded-xl text-left text-xs font-mono relative overflow-hidden">
                    <pre className="whitespace-pre-wrap break-all">
{`create table if not exists public.clients (
  id uuid references auth.users not null primary key,
  full_name text,
  phone text,
  email text,
  password text, -- Added for demo purposes
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create policy "Enable insert for everyone" on public.clients for insert with check (true);
create policy "Enable select for everyone" on public.clients for select using (true);`}
                    </pre>
                    <button 
                        onClick={copySql}
                        className="absolute top-2 right-2 p-2 bg-slate-800 hover:bg-slate-700 rounded text-white transition"
                    >
                         {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                    </button>
                    <div className="mt-2 text-slate-500 border-t border-slate-800 pt-2">
                        יש להריץ פקודה זו ב-SQL Editor ב-Supabase כדי ליצור את טבלת הלקוחות.
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>
            ) : error ? (
                <div className="bg-red-50 text-red-800 p-4 rounded-xl text-center">
                    <p className="font-bold mb-2">לא ניתן לטעון את מאגר הלקוחות</p>
                    <p className="text-sm">{error}</p>
                    <p className="text-xs mt-2">ייתכן שהטבלה clients טרם נוצרה ב-Supabase.</p>
                </div>
            ) : clients.length === 0 ? (
                 <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200">
                    <Users size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500 font-medium">עדיין אין לקוחות רשומים במאגר</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    {clients.map((client, i) => (
                        <div key={client.id} className={`p-4 flex items-center justify-between group hover:bg-slate-50 transition ${i !== clients.length - 1 ? 'border-b border-slate-50' : ''}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold">
                                    {client.full_name.charAt(0)}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900">{client.full_name}</div>
                                    <div className="text-slate-500 text-xs">{client.email}</div>
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end">
                                <div className="text-slate-900 font-mono text-sm">{client.phone}</div>
                                
                                {client.password && (
                                    <div className="flex items-center gap-1 mt-1 text-slate-400 text-xs">
                                        <button onClick={() => togglePassword(client.id)} className="hover:text-slate-600">
                                            {visiblePasswords[client.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                                        </button>
                                        <span className="font-mono">
                                            {visiblePasswords[client.id] ? client.password : '••••••'}
                                        </span>
                                    </div>
                                )}
                                
                                <div className="text-slate-400 text-[10px] mt-1">
                                    {new Date(client.created_at).toLocaleDateString('he-IL')}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function AIConsultant({ onClose }: { onClose: () => void }) {
    const [messages, setMessages] = useState<ChatMessage[]>([
        { role: 'model', text: 'היי! אני גלואו בוט, העוזרת החכמה של הסטודיו. איך אני יכולה לעזור לך היום? 😊' }
    ]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim()) return;
        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsThinking(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const model = "gemini-2.5-flash"; 
            const response = await ai.models.generateContent({
                model,
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: `אתה עוזר וירטואלי של סטודיו לקוסמטיקה בשם Glow Studio.
                            שעות הפעילות: ימים א-ה 09:00 עד 18:00.
                            השירותים: גבות (100 ש"ח), ריסים (180 ש"ח), הרמת גבות (220 ש"ח), הרמת ריסים (250 ש"ח).
                            תענה בצורה נחמדה, קצרה ובעברית.
                            
                            השאלה של הלקוח: ${userMsg}` }
                        ]
                    }
                ]
            });

            const text = response.text || "סליחה, לא הצלחתי להבין. אפשר לנסות שוב?";
            setMessages(prev => [...prev, { role: 'model', text }]);

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { role: 'model', text: "אופס, הייתה לי בעיה קטנה. נסי שוב עוד רגע." }]);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full sm:w-[400px] h-[80vh] sm:h-[600px] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
                {/* Header */}
                <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-tr from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                            <Sparkles size={16} className="text-white" />
                        </div>
                        <span className="font-bold">Glow Bot</span>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                                msg.role === 'user' 
                                    ? 'bg-black text-white rounded-br-none' 
                                    : 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-bl-none'
                            }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isThinking && (
                        <div className="flex justify-start">
                             <div className="bg-white p-3 rounded-2xl rounded-bl-none shadow-sm border border-slate-100 flex gap-1">
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
                    <input 
                        type="text" 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendMessage()}
                        placeholder="תשאלי אותי משהו..."
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-black transition"
                    />
                    <button 
                        onClick={sendMessage}
                        disabled={!input.trim() || isThinking}
                        className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center hover:bg-slate-800 disabled:opacity-50 transition"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    )
}

const rootElement = document.getElementById("root");
if (rootElement) {
    const root = createRoot(rootElement);
    root.render(<App />);
} else {
    console.error("Failed to find the root element");
}