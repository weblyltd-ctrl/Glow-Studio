import React, { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import { GoogleGenAI } from "@google/genai";
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
  RefreshCw
} from "lucide-react";

// --- Configuration ---

// ============================================================================
// 👇 וודאי שביצעת DEPLOY חדש עם הרשאות "Anyone" (מי שיש לו גישה: כולם) 👇
const API_URL = "https://script.google.com/macros/s/AKfycbyw3fdH3QXT4ih2lNXASA1n5Fk31XkJpKMczfws79Iej8P5VcLtSr9yz12UTt8buLue/exec"; 
// ============================================================================

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
  step: "home" | "services" | "date" | "details" | "confirmation" | "waiting-list-confirmed" | "manage-login" | "manage-list";
  service: Service | null;
  date: Date | null;
  time: string | null;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  isWaitingList: boolean;
};

type ClientBooking = {
  date: string;
  time: string;
  service: string;
  name: string;
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

// Aggressive time normalizer to handle "9:00", "09:00", "9:00:00", etc.
const normalizeTime = (t: any): string | null => {
    if (!t) return null;
    let s = String(t).trim();
    
    // Check for HH:MM pattern (ignoring seconds or other text)
    const match = s.match(/(\d{1,2}):(\d{2})/);
    if (match) {
        let h = match[1].padStart(2, '0');
        let m = match[2];
        return `${h}:${m}`;
    }
    return null;
}

// Aggressive date key cleaner
const normalizeDateKey = (k: string): string => {
    if (!k) return "";
    // Extract YYYY-MM-DD pattern directly if possible
    const match = k.match(/(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
    
    // Fallback: try parsing date
    const d = new Date(k);
    if (!isNaN(d.getTime())) {
        return getDateKey(d);
    }
    return k.substring(0, 10);
};

const isWorkingDay = (date: Date) => WORKING_DAYS.includes(date.getDay());

const getNextWorkingDays = (count: number) => {
  const days: Date[] = [];
  let current = new Date();
  
  while (days.length < count) {
    if (isWorkingDay(current)) {
      days.push(new Date(current));
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
};

const getWaitCount = (t: string) => {
  const sum = t.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return (sum % 4) + 1; // Returns 1 to 4
};

// --- API Service (Google Sheets Bridge) ---

const api = {
  // Fetch booked slots from Google Sheets
  fetchBookedSlots: async (): Promise<{ connected: boolean; slots: Record<string, string[]> }> => {
    if (!API_URL) return { connected: false, slots: {} };

    try {
      const urlWithTimestamp = `${API_URL}?t=${new Date().getTime()}&action=get_slots`;
      
      const response = await fetch(urlWithTimestamp, {
          method: 'GET',
          redirect: 'follow', // Ensure we follow Google's redirects
          headers: {
              'Accept': 'application/json'
          }
      });
      
      if (!response.ok) throw new Error(`Server responded with ${response.status}`);
      
      // Parse JSON carefully
      const text = await response.text();
      let rawData;
      try {
          rawData = JSON.parse(text);
      } catch (e) {
          console.error("Failed to parse JSON response:", text.substring(0, 100));
          throw new Error("Invalid JSON response");
      }
      
      // Normalize Data immediately upon receipt
      const normalizedData: Record<string, string[]> = {};
      
      if (rawData && typeof rawData === 'object') {
          Object.keys(rawData).forEach(key => {
              const cleanDateKey = normalizeDateKey(key);
              
              if (!normalizedData[cleanDateKey]) {
                  normalizedData[cleanDateKey] = [];
              }

              const times = Array.isArray(rawData[key]) ? rawData[key] : [];
              times.forEach((t: any) => {
                  const cleanTime = normalizeTime(t);
                  if (cleanTime) {
                      normalizedData[cleanDateKey].push(cleanTime);
                  }
              });
          });
      }

      return { connected: true, slots: normalizedData };
    } catch (error) {
      console.error("API connection failed.", error);
      return { connected: false, slots: {} };
    }
  },

  // Fetch bookings for a specific client (by phone)
  fetchClientBookings: async (phone: string): Promise<ClientBooking[]> => {
    if (!API_URL) return [];
    try {
      const url = `${API_URL}?t=${new Date().getTime()}&action=get_client_bookings&phone=${phone}`;
      const response = await fetch(url, { redirect: 'follow' });
      if (!response.ok) return [];
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Failed to fetch client bookings", error);
      return [];
    }
  },

  // Save booking
  saveBooking: async (bookingData: any) => {
    if (!API_URL) return { success: false };

    try {
      const type = bookingData.isWaitingList ? "רשימת המתנה" : "תור רגיל";
      const payload = {
        action: 'save',
        date: getDateKey(bookingData.date),
        time: bookingData.time,
        service: bookingData.service.name,
        name: bookingData.clientName,
        phone: bookingData.clientPhone,
        email: bookingData.clientEmail,
        type: type 
      };

      const postUrl = `${API_URL}?t=${new Date().getTime()}&action=save`;
      await fetch(postUrl, {
        method: "POST",
        mode: "no-cors", 
        keepalive: true,
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
      });
      return { success: true };
    } catch (error) {
      console.error("Error saving booking:", error);
      return { success: false };
    }
  },

  // Cancel booking
  cancelBooking: async (booking: ClientBooking, phone: string) => {
    if (!API_URL) return { success: false };
    try {
      const payload = {
        action: 'cancel',
        date: booking.date, 
        time: booking.time,
        phone: phone
      };

      const postUrl = `${API_URL}?t=${new Date().getTime()}&action=cancel`;
      await fetch(postUrl, {
        method: "POST",
        mode: "no-cors", 
        keepalive: true,
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
      });
      return { success: true };
    } catch (error) {
      console.error("Error canceling booking:", error);
      return { success: false };
    }
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
      
      const isBooked = bookedTimes.has(timeString);
      const waitingCount = isBooked ? getWaitCount(timeString) : 0;
      
      slots.push({
        time: timeString,
        available: !isBooked,
        waitingCount
      });
    }
    current = new Date(current.getTime() + 30 * 60000); 
  }
  return slots;
};

// --- Components ---

function App() {
  const [state, setState] = useState<AppointmentState>({
    step: "home",
    service: null,
    date: null,
    time: null,
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    isWaitingList: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const resetFlow = () => {
    setState({
      step: "home",
      service: null,
      date: null,
      time: null,
      clientName: "",
      clientPhone: "",
      clientEmail: "",
      isWaitingList: false
    });
    setIsSubmitting(false);
  };

  const nextStep = (next: AppointmentState["step"]) => {
    setState(prev => ({ ...prev, step: next }));
  };

  const handleDetailsSubmit = async () => {
    setIsSubmitting(true);
    await api.saveBooking(state);
    setIsSubmitting(false);
    
    if (state.isWaitingList) {
      nextStep("waiting-list-confirmed");
    } else {
      nextStep("confirmation");
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-slate-800 font-sans selection:bg-pink-200 selection:text-pink-900 pb-20 md:pb-0 relative overflow-x-hidden">
      
      {/* Background Decor */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-rose-50 rounded-full blur-[80px] opacity-70"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-pink-50 rounded-full blur-[80px] opacity-70"></div>
        <div className="absolute top-[40%] left-[20%] w-[300px] h-[300px] bg-slate-100 rounded-full blur-[60px] opacity-50"></div>
      </div>

      <div className="relative z-10">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/70 backdrop-blur-lg border-b border-white/50 shadow-sm">
        <div className="w-full max-w-lg mx-auto px-3 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={resetFlow}>
            <div className="w-8 h-8 bg-gradient-to-tr from-pink-500 to-rose-400 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
              G
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">Glow Studio</span>
          </div>
          
          <div className="flex items-center gap-3">
             {state.step === 'home' ? (
                <button onClick={() => nextStep('manage-login')} className="flex items-center gap-1 text-sm text-slate-600 hover:text-pink-600 transition bg-white/80 px-3 py-1.5 rounded-full border border-slate-200/50 shadow-sm hover:shadow-md">
                  <User size={14} />
                  <span className="hidden sm:inline">התורים שלי</span>
                </button>
             ) : (
                <button onClick={resetFlow} className="text-sm text-slate-500 hover:text-pink-600 transition">
                  ביטול
                </button>
             )}
          </div>
        </div>
      </header>

      <main className="w-full max-w-lg mx-auto px-3 md:px-4 py-6">
        {state.step === "home" && (
          <HeroSection onStart={() => nextStep("services")} />
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
            onDateSelect={(d) => setState(prev => ({ ...prev, date: d, time: null, isWaitingList: false }))}
            onTimeSelect={(t, isWaitingList) => setState(prev => ({ ...prev, time: t, isWaitingList }))}
            onNext={() => nextStep("details")}
            onBack={() => nextStep("services")}
            isValid={!!state.date && !!state.time}
          />
        )}

        {state.step === "details" && (
          <ClientDetails 
            name={state.clientName}
            phone={state.clientPhone}
            email={state.clientEmail}
            isWaitingList={state.isWaitingList}
            isLoading={isSubmitting}
            onChange={(field, val) => setState(prev => ({ ...prev, [field]: val }))}
            onNext={handleDetailsSubmit}
            onBack={() => nextStep("date")}
          />
        )}

        {state.step === "confirmation" && (
          <Confirmation state={state} onReset={resetFlow} />
        )}

        {state.step === "waiting-list-confirmed" && (
          <WaitingListConfirmation state={state} onReset={resetFlow} />
        )}

        {state.step === "manage-login" && (
          <ManageLogin 
            onLogin={(phone) => {
              setState(prev => ({ ...prev, clientPhone: phone }));
              nextStep('manage-list');
            }}
            onBack={() => nextStep('home')}
          />
        )}

        {state.step === "manage-list" && (
          <ManageList 
            phone={state.clientPhone}
            onBack={() => nextStep('home')}
          />
        )}

      </main>

      {/* Floating Chat Button */}
      {state.step !== "confirmation" && state.step !== "waiting-list-confirmed" && (
        <div className="fixed bottom-4 left-4 z-50">
          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="bg-slate-900 text-white p-4 rounded-full shadow-lg hover:bg-slate-800 transition-transform hover:scale-105 flex items-center gap-2"
          >
            {isChatOpen ? <X size={24} /> : <MessageCircle size={24} />}
            {!isChatOpen && <span className="font-medium px-1 hidden md:inline">התייעצי איתנו</span>}
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

function ManageLogin({ onLogin, onBack }: { onLogin: (phone: string) => void, onBack: () => void }) {
  const [phone, setPhone] = useState("");
  const isValid = phone.replace(/\D/g, '').length === 10;

  return (
    <div className="space-y-6 animate-fade-in-up">
       <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-white/50"><ChevronRight /></button>
        <h2 className="text-2xl font-bold">ניהול תורים</h2>
      </div>
      
      <div className="space-y-4">
        <div className="bg-white/60 p-4 rounded-xl flex items-center gap-3 text-pink-800 border border-pink-100 shadow-sm">
           <Info size={20} />
           <p className="text-sm">הזיני את מספר הטלפון איתו נרשמת כדי לצפות ולבטל תורים עתידיים.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">מספר טלפון</label>
          <input 
            type="tel" 
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="050-0000000"
            className="w-full p-4 rounded-xl border border-slate-200 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition-all bg-white/70 focus:bg-white text-lg tracking-wide shadow-sm"
          />
        </div>
      </div>

      <button
        onClick={() => onLogin(phone)}
        disabled={!isValid}
        className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-lg disabled:opacity-50 hover:bg-slate-800 transition-colors"
      >
        כניסה לאזור אישי
      </button>
    </div>
  )
}

function ManageList({ phone, onBack }: { phone: string, onBack: () => void }) {
  const [bookings, setBookings] = useState<ClientBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState<string | null>(null); // holds date+time of booking being canceled

  const loadBookings = async () => {
    setLoading(true);
    const data = await api.fetchClientBookings(phone);
    // Filter out past bookings if needed, or sort them
    // Sorting by date
    const sorted = data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setBookings(sorted);
    setLoading(false);
  };

  useEffect(() => {
    loadBookings();
  }, [phone]);

  const handleCancel = async (booking: ClientBooking) => {
    if (!confirm('האם את בטוחה שברצונך לבטל את התור?')) return;
    
    setCanceling(booking.date + booking.time);
    await api.cancelBooking(booking, phone);
    
    // Refresh list after small delay
    setTimeout(() => {
       loadBookings();
       setCanceling(null);
    }, 1500);
  };

  return (
    <div className="space-y-6 animate-fade-in-up h-full flex flex-col">
       <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-white/50"><ChevronRight /></button>
        <h2 className="text-2xl font-bold">התורים שלי</h2>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
           <Loader2 size={32} className="animate-spin mb-2" />
           <p className="text-sm">טוען נתונים...</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-12 bg-white/60 rounded-xl border border-dashed border-slate-300 shadow-sm">
           <CalendarDays size={48} className="mx-auto text-slate-300 mb-3" />
           <p className="text-slate-500 font-medium">לא נמצאו תורים עתידיים</p>
           <button onClick={onBack} className="text-pink-600 text-sm mt-2 font-medium hover:underline">קבעי תור חדש</button>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((booking, idx) => {
             const isCanceling = canceling === (booking.date + booking.time);
             const dateObj = new Date(booking.date);
             return (
               <div key={idx} className="bg-white/80 backdrop-blur-sm border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                  <div>
                    <h3 className="font-bold text-slate-900">{booking.service}</h3>
                    <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                       <Calendar size={14} />
                       <span>{dateObj.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' })}</span>
                       <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                       <Clock size={14} />
                       <span>{booking.time}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleCancel(booking)}
                    disabled={isCanceling}
                    className="p-3 text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    {isCanceling ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                  </button>
               </div>
             )
          })}
        </div>
      )}
    </div>
  )
}

function HeroSection({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center text-center space-y-8 py-8 animate-fade-in relative z-10">
      <div className="relative group cursor-pointer" onClick={onStart}>
        <div className="absolute inset-0 bg-pink-300 blur-2xl opacity-40 rounded-full w-48 h-48 -z-10 group-hover:opacity-60 transition-opacity duration-700"></div>
        <img 
          src="https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?auto=format&fit=crop&q=80&w=400&h=400" 
          alt="Beauty Care" 
          className="w-48 h-48 object-cover rounded-full border-4 border-white shadow-xl mx-auto transform group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute -bottom-2 -right-2 bg-white p-2 rounded-full shadow-md animate-bounce-slow">
          <Star className="text-yellow-400 fill-yellow-400" size={24} />
        </div>
      </div>
      
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-slate-900 leading-tight drop-shadow-sm">
          העיניים שלך,<br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-rose-400">האומנות שלנו.</span>
        </h1>
        <p className="text-slate-600 text-lg px-4 font-medium">
          עיצוב גבות וריסים ברמה הגבוהה ביותר,<br/> בהתאמה אישית למבנה הפנים שלך.
        </p>
      </div>

      <div className="w-full max-w-xs space-y-3">
        <button 
          onClick={onStart}
          className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-slate-800 hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <Calendar size={20} />
          קבעי תור עכשיו
        </button>
        <p className="text-xs text-slate-500 font-medium">פגישת ייעוץ ללא עלות • חניה חינם</p>
        <p className="text-xs text-slate-500 font-medium">ימים א'-ה' • 09:00 - 18:00</p>
      </div>
    </div>
  );
}

function ServiceSelection({ services, onSelect, onBack }: { services: Service[], onSelect: (s: Service) => void, onBack: () => void }) {
  const [filter, setFilter] = useState<"all" | "brows" | "lashes">("all");

  const filtered = services.filter(s => filter === "all" || s.category === filter || s.category === "combo");

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">בחרי טיפול</h2>
        <button onClick={onBack} className="text-slate-500 hover:text-slate-700 font-medium">
           חזרה
        </button>
      </div>

      <div className="flex p-1 bg-white rounded-xl shadow-sm border border-slate-100">
        {(['all', 'lashes', 'brows'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              filter === cat 
                ? 'bg-rose-50 text-pink-700 shadow-sm ring-1 ring-pink-100' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            {cat === 'all' ? 'הכל' : cat === 'lashes' ? 'ריסים' : 'גבות'}
          </button>
        ))}
      </div>

      <div className="space-y-4 pb-20">
        {filtered.map(service => (
          <div 
            key={service.id}
            onClick={() => onSelect(service)}
            className="group bg-white/80 backdrop-blur-sm border border-white rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-pink-200 transition-all cursor-pointer flex items-center justify-between"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg text-slate-900">{service.name}</h3>
                {service.category === 'combo' && (
                  <span className="bg-pink-100 text-pink-600 text-[10px] font-bold px-2 py-0.5 rounded-full">מבצע</span>
                )}
              </div>
              <p className="text-sm text-slate-500 line-clamp-2">{service.description}</p>
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-1"><Clock size={12} /> {service.duration} דק׳</span>
                <span className="flex items-center gap-1 text-slate-900 text-base font-bold">₪{service.price}</span>
              </div>
            </div>
            <div className="mr-4">
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-300 group-hover:bg-pink-500 group-hover:text-white transition-colors shadow-sm">
                <ChevronLeft size={20} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DateSelection({ service, selectedDate, selectedTime, onDateSelect, onTimeSelect, onNext, onBack, isValid }: any) {
  const dates = getNextWorkingDays(14);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<Record<string, string[]>>({});
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // Fetch data from API (or Mock) when component mounts
    let mounted = true;
    const loadData = async () => {
      setIsLoading(true);
      setConnectionError(false);
      const result = await api.fetchBookedSlots();
      if (mounted) {
        if (result.connected) {
          setBookedSlots(result.slots);
        } else {
          setConnectionError(true);
        }
        setIsLoading(false);
      }
    };
    loadData();
    return () => { mounted = false; };
  }, [retryCount]);

  const isSameDay = (d1: Date | null, d2: Date) => {
    return d1 && d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth();
  };

  const slots = selectedDate && service && !isLoading
    ? generateTimeSlots(selectedDate, service.duration, bookedSlots) 
    : [];

  return (
    <div className="space-y-6 animate-fade-in-up h-full flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 rounded-full hover:bg-white/50"><ChevronRight /></button>
            <h2 className="text-2xl font-bold">מתי נוח לך?</h2>
        </div>
        <button 
            onClick={() => setRetryCount(c => c + 1)} 
            className="p-2 rounded-full hover:bg-white/50 text-slate-400"
            title="רענן נתונים"
        >
            <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      {connectionError && (
        <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-xl p-4 flex gap-3 text-red-800 text-sm animate-pulse">
          <WifiOff size={20} className="flex-shrink-0" />
          <div>
            <p className="font-bold">שגיאת תקשורת עם המערכת</p>
            <p className="text-xs opacity-80 mt-1">נא לוודא שכתובת ה-Script נכונה ושההרשאות הן 'Anyone'.</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">תאריך (א׳-ה׳)</label>
        <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-hide px-1">
          {dates.map((date, i) => {
            const selected = isSameDay(selectedDate, date);
            return (
              <button
                key={i}
                onClick={() => onDateSelect(date)}
                className={`flex-shrink-0 w-[12%] min-w-[42px] flex flex-col items-center p-1 rounded-xl border transition-all shadow-sm ${
                  selected 
                    ? 'border-pink-500 bg-pink-50 text-pink-700' 
                    : 'border-white bg-white hover:border-pink-200 text-slate-600'
                }`}
              >
                <span className="text-[10px]">{date.toLocaleDateString('he-IL', { month: 'short' })}</span>
                <span className="text-lg font-bold my-0.5">{date.getDate()}</span>
                <span className="text-[10px] opacity-75">{date.toLocaleDateString('he-IL', { weekday: 'short' })}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className={`space-y-2 transition-opacity duration-300 flex-1 ${selectedDate ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
        <label className="text-sm font-medium text-slate-700">בחרי שעה</label>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
             <Loader2 size={32} className="animate-spin mb-2" />
             <p className="text-sm">בודק זמינות...</p>
          </div>
        ) : slots.length > 0 ? (
            <div className="grid grid-cols-3 gap-3">
            {slots.map((slot) => {
               const isBooked = !slot.available;
               const isSelected = selectedTime === slot.time;
               
               return (
                <button
                key={slot.time}
                onClick={() => {
                   onTimeSelect(slot.time, isBooked);
                }}
                className={`relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all min-h-[70px] shadow-sm ${
                    isSelected
                        ? isBooked
                             ? 'bg-orange-50 border-orange-500 shadow-md scale-105 z-10'
                             : 'bg-slate-900 text-white border-slate-900 shadow-lg scale-105 z-10'
                        : isBooked
                            ? 'bg-gray-100/50 border-gray-200 text-gray-400 cursor-pointer hover:bg-gray-200/50' 
                            : 'bg-white text-slate-700 border-white hover:border-pink-300 hover:shadow-md'
                }`}
                >
                <span className={`text-base font-bold ${isBooked ? 'line-through decoration-gray-400 decoration-2 opacity-50' : ''} ${isSelected && isBooked ? 'text-orange-700' : ''}`}>
                  {slot.time}
                </span>
                
                {isBooked && (
                    <div className={`absolute -top-2 -left-2 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-white shadow-sm ${isSelected ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-600'}`}>
                      <Ban size={10} />
                      תפוס
                    </div>
                )}
                
                {isBooked && (
                   <span className={`text-[10px] font-medium mt-1 no-underline ${isSelected ? 'text-orange-600' : 'text-gray-400'}`}>
                       {isSelected ? 'נבחר להמתנה' : 'להמתנה?'}
                   </span>
                )}
                </button>
               );
            })}
            </div>
        ) : (
             <div className="text-center py-8 bg-white/60 rounded-xl border border-dashed border-slate-300 shadow-sm">
                <p className="text-slate-500 text-sm">אין תורים פנויים בתאריך זה</p>
                <button 
                  onClick={() => onTimeSelect("כל היום", true)}
                  className="mt-2 text-pink-600 font-medium text-sm hover:underline"
                >
                  הצטרפי לרשימת המתנה יומית
                </button>
             </div>
        )}
        
        {!isLoading && slots.length > 0 && (
             <div className="mt-6 p-4 bg-pink-50/80 backdrop-blur-sm rounded-xl border border-pink-100 flex items-start gap-3 shadow-sm">
                <Bell className="text-pink-500 flex-shrink-0 mt-1" size={16} />
                <div>
                    <h4 className="font-bold text-sm text-pink-800">השעה הרצויה תפוסה?</h4>
                    <p className="text-xs text-pink-600 mt-1">
                        ניתן לבחור שעה תפוסה ולהצטרף לרשימת ההמתנה.
                    </p>
                </div>
            </div>
        )}
      </div>

      <button
        onClick={onNext}
        disabled={!isValid || isLoading || connectionError}
        className="w-full bg-pink-500 text-white py-4 rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-pink-600 transition-colors"
      >
        המשך לפרטים
      </button>
    </div>
  );
}

function ClientDetails({ name, phone, email, onChange, onNext, onBack, isWaitingList, isLoading }: any) {
  const cleanPhone = phone.replace(/\D/g, '');
  const isPhoneValid = cleanPhone.length === 10;
  const isNameValid = name.trim().length >= 2;
  const isValid = isNameValid && isPhoneValid && email.includes('@');

  return (
    <div className="space-y-6 animate-fade-in-up h-full flex flex-col">
       <div className="flex items-center gap-4">
        <button onClick={onBack} disabled={isLoading} className="p-2 rounded-full hover:bg-white/50 disabled:opacity-50"><ChevronRight /></button>
        <h2 className="text-2xl font-bold">{isWaitingList ? 'הרשמה לרשימת המתנה' : 'פרטים אישיים'}</h2>
      </div>
      
      {isWaitingList && (
          <div className="bg-yellow-50/80 backdrop-blur-sm border border-yellow-200 rounded-xl p-4 flex gap-3 text-yellow-800 text-sm shadow-sm">
              <AlertCircle size={20} className="flex-shrink-0" />
              <div>
                <p className="font-bold">את מצטרפת לרשימת המתנה.</p>
                <p className="text-xs opacity-80 mt-1">אנחנו נעדכן אותך אוטומטית אם התור יתפנה.</p>
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
            disabled={isLoading}
            placeholder="ישראל ישראלי"
            className={`w-full p-4 rounded-xl border ${!isNameValid && name.length > 0 ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-pink-500'} focus:ring-1 focus:ring-pink-500 outline-none transition-all bg-white/70 focus:bg-white disabled:bg-slate-100 shadow-sm`}
          />
          {!isNameValid && name.length > 0 && (
             <p className="text-xs text-red-500 mt-1">נא להזין שם מלא (לפחות 2 תווים)</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">מספר טלפון</label>
          <input 
            type="tel" 
            value={phone}
            onChange={(e) => onChange('clientPhone', e.target.value)}
            disabled={isLoading}
            placeholder="050-0000000"
            className={`w-full p-4 rounded-xl border ${!isPhoneValid && phone.length > 0 ? 'border-red-300 focus:border-red-500' : 'border-slate-200 focus:border-pink-500'} focus:ring-1 focus:ring-pink-500 outline-none transition-all bg-white/70 focus:bg-white disabled:bg-slate-100 shadow-sm`}
          />
          {!isPhoneValid && phone.length > 0 && (
             <p className="text-xs text-red-500 mt-1">מספר הטלפון חייב להכיל 10 ספרות</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">כתובת אימייל</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => onChange('clientEmail', e.target.value)}
            disabled={isLoading}
            placeholder="example@mail.com"
            className="w-full p-4 rounded-xl border border-slate-200 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 outline-none transition-all bg-white/70 focus:bg-white disabled:bg-slate-100 shadow-sm"
          />
           <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
            <Info size={12} />
            נשלח לך אישור למייל ול-SMS.
          </p>
        </div>
      </div>

      <div className="flex-1"></div>

      <button
        onClick={onNext}
        disabled={!isValid || isLoading}
        className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-lg disabled:opacity-50 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
      >
        {isLoading && <Loader2 className="animate-spin" size={20} />}
        {isLoading 
            ? 'שומר נתונים...' 
            : isWaitingList ? 'אשרי הרשמה' : 'אישור וקביעת תור'
        }
      </button>
    </div>
  );
}

function Confirmation({ state, onReset }: { state: AppointmentState, onReset: () => void }) {
  return (
    <div className="flex flex-col items-center text-center space-y-6 py-8 animate-scale-in">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2 shadow-sm">
        <CheckCircle size={40} />
      </div>
      
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">התור נקבע בהצלחה!</h2>
        <p className="text-slate-500 mt-2">אישור נשלח למייל {state.clientEmail}.</p>
      </div>

      <div className="w-full bg-white/80 backdrop-blur-sm border border-white rounded-2xl p-6 shadow-sm space-y-4 text-right">
        <div className="flex justify-between items-center pb-3 border-b border-slate-50">
          <span className="text-slate-500">טיפול</span>
          <span className="font-bold text-slate-900">{state.service?.name}</span>
        </div>
        <div className="flex justify-between items-center pb-3 border-b border-slate-50">
          <span className="text-slate-500">תאריך</span>
          <span className="font-bold text-slate-900">
            {state.date?.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>
        <div className="flex justify-between items-center pb-3 border-b border-slate-50">
          <span className="text-slate-500">שעה</span>
          <span className="font-bold text-slate-900">{state.time}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">מחיר משוער</span>
          <span className="font-bold text-pink-600">₪{state.service?.price}</span>
        </div>
      </div>

      <div className="text-xs text-slate-400 max-w-xs mx-auto">
        תזכורת תשלח 24 שעות לפני מועד התור.
      </div>

      <button 
        onClick={onReset}
        className="text-slate-400 hover:text-slate-600 font-medium text-sm mt-8"
      >
        חזרה לדף הבית
      </button>
    </div>
  );
}

function WaitingListConfirmation({ state, onReset }: { state: AppointmentState, onReset: () => void }) {
  return (
    <div className="flex flex-col items-center text-center space-y-6 py-8 animate-scale-in">
      <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 mb-2 shadow-sm">
        <Bell size={40} />
      </div>
      
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900">נרשמת לרשימת המתנה</h2>
        <p className="text-slate-500 mt-2">אם יתפנה תור בתאריך ובשעה שביקשת, נעדכן אותך מיידית.</p>
      </div>

      <div className="w-full bg-white/80 backdrop-blur-sm border border-white rounded-2xl p-6 shadow-sm space-y-4 text-right">
        <div className="flex justify-between items-center pb-3 border-b border-slate-50">
           <span className="text-slate-500">ביקשת עבור</span>
           <span className="font-bold text-slate-900">{state.service?.name}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-500">זמן מבוקש</span>
           <span className="font-bold text-slate-900">
             {state.date?.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' })} בשעה {state.time}
           </span>
        </div>
      </div>

      <button 
        onClick={onReset}
        className="text-slate-400 hover:text-slate-600 font-medium text-sm mt-8"
      >
        חזרה לדף הבית
      </button>
    </div>
  );
}

function AIConsultant({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "model", text: "היי! אני היועצת הווירטואלית של Glow. את מתלבטת איזה טיפול מתאים לך? ספרי לי קצת על הריסים או הגבות שלך :)" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = input;
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setInput("");
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const servicesContext = SERVICES.map(s => `${s.name} (${s.description})`).join(", ");
      
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          {
            role: "user",
            parts: [{ text: `
              You are a friendly and professional beauty consultant for 'Glow Lashes & Brows' in Israel.
              Your goal is to help the customer choose one of our services based on their description.
              Our services are: ${servicesContext}.
              
              Rules:
              1. Answer in Hebrew only.
              2. Be concise (max 2-3 sentences).
              3. Be warm and inviting.
              4. If they ask about something we don't do, politely say we focus on lashes and brows.
              5. Recommend specific services from the list.

              Customer message: "${userMsg}"
            ` }]
          }
        ]
      });

      const text = response.text;
      setMessages(prev => [...prev, { role: "model", text: text || "אופס, הייתה בעיה בתקשורת. נסי שוב מאוחר יותר." }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: "model", text: "מתנצלת, יש לי קצת עומס כרגע. אולי תנסי לבחור מהתפריט?" }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-md h-[600px] max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Chat Header */}
        <div className="bg-slate-900 p-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold">Glow AI Consultant</h3>
              <p className="text-xs text-slate-300">אונליין</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition"><X size={20} /></button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
              <div 
                className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-white border border-slate-200 text-slate-800 rounded-br-none' 
                    : 'bg-pink-500 text-white rounded-bl-none shadow-md'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-end">
              <div className="bg-pink-100 text-pink-500 p-3 rounded-2xl rounded-bl-none text-xs animate-pulse">
                מקלידה...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="התייעצי איתי..."
            className="flex-1 bg-slate-100 border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-pink-500 outline-none text-sm"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-slate-900 text-white p-3 rounded-xl hover:bg-slate-700 disabled:opacity-50 transition"
          >
            <Send size={20} className={isLoading ? 'opacity-0' : 'opacity-100'} />
          </button>
        </div>
      </div>
    </div>
  );
}

const container = document.getElementById("root");
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}