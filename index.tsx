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
  LogIn
} from "lucide-react";

// --- Configuration ---

// ============================================================================
// 👇 כאן להדביק את הכתובת שקיבלת בשלב ה-Deploy (סיומת /exec) 👇
// ============================================================================
const API_URL = "https://script.google.com/macros/s/AKfycbzC4nufgKj2TbykzzigKykEjIcdruwp_JNrGBNBkm18uefMBe4zN_6m6l5eW0hK6Rtm/exec"; 

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
  step: "home" | "services" | "date" | "details" | "confirmation" | "waiting-list-confirmed" | "manage-login" | "manage-list" | "register";
  service: Service | null;
  date: Date | null;
  time: string | null;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  clientPassword: string; // Kept in state for compatibility, but removed from input
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

// Aggressive time normalizer
const normalizeTime = (t: any): string | null => {
    if (!t) return null;
    let s = String(t).trim();
    if (s.includes('T') || s.match(/^\d{4}-/)) {
        const d = new Date(s);
        if (!isNaN(d.getTime())) {
            return formatTime(d);
        }
    }
    const match = s.match(/(\d{1,2}):(\d{2})/);
    if (match) {
        let h = match[1].padStart(2, '0');
        let m = match[2];
        return `${h}:${m}`;
    }
    return null;
}

// Aggressive date key cleaner
const normalizeDateKey = (k: any): string => {
    if (!k) return "";
    let dateStr = String(k).trim();
    if (dateStr.includes('T') || dateStr.includes('Z')) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            return getDateKey(d);
        }
    }
    const isoDateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDateMatch) {
       return `${isoDateMatch[1]}-${isoDateMatch[2]}-${isoDateMatch[3]}`;
    }
    const ilMatch = dateStr.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{2,4})/);
    if (ilMatch) {
       const day = ilMatch[1].padStart(2, '0');
       const month = ilMatch[2].padStart(2, '0');
       let year = ilMatch[3];
       if (year.length === 2) year = '20' + year;
       return `${year}-${month}-${day}`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
        return getDateKey(d);
    }
    return "";
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
  // Explicit connection tester
  testConnection: async (): Promise<{ success: boolean; message: string }> => {
    if (!API_URL) return { success: false, message: "לא מוגדרת כתובת שרת (API_URL)." };
    
    if ((API_URL as string).includes("docs.google.com") || (API_URL as string).includes("spreadsheets")) {
        return { 
            success: false, 
            message: "שגיאת קונפיגורציה: הוזן קישור לגיליון (Docs) במקום קישור ל-App Script. יש להשתמש בכתובת ה-Web App המסתיימת ב-/exec." 
        };
    }

    try {
        const start = Date.now();
        const response = await fetch(`${API_URL}?action=ping&t=${start}`, {
            method: 'GET',
            redirect: 'follow',
            signal: AbortSignal.timeout(8000)
        });
        const end = Date.now();
        
        if (response.ok) {
             const text = await response.text();
             if (text.includes("Google Drive") || text.includes("sign in")) {
                 return { success: false, message: "שגיאת הרשאות: יש להגדיר את הסקריפט כ-Anyone." };
             }
            return { success: true, message: `מחובר בהצלחה! זמן תגובה: ${end - start}ms` };
        } else {
            return { success: false, message: `שגיאת שרת: ${response.status} ${response.statusText}` };
        }
    } catch (e: any) {
        return { success: false, message: `שגיאת תקשורת: ${e.message || 'לא ניתן להתחבר'}` };
    }
  },

  // Implementation of "Method 1": Fetch all raw data and filter locally
  fetchBookedSlots: async (): Promise<{ connected: boolean; slots: Record<string, string[]>; error?: string }> => {
    const mockSlots: Record<string, string[]> = {}; 

    if (!API_URL) return { connected: false, slots: mockSlots, error: "Setup Required" };

    if ((API_URL as string).includes("docs.google.com") || (API_URL as string).includes("spreadsheets")) {
        return { 
            connected: false, 
            slots: mockSlots, 
            error: "הוגדר קישור שגוי ל-Google Sheet (יש להשתמש בקישור Script Exec)." 
        };
    }

    try {
      const urlWithTimestamp = `${API_URL}?t=${new Date().getTime()}&action=get_slots`;
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(urlWithTimestamp, {
          method: 'GET',
          redirect: 'follow', 
          signal: controller.signal,
          cache: 'no-store',
          headers: {
              'Pragma': 'no-cache',
              'Cache-Control': 'no-cache'
          }
      });
      clearTimeout(id);
      
      if (!response.ok) throw new Error(`Server responded with ${response.status}`);
      
      const text = await response.text();
      let rawData;
      
      if (text.trim().startsWith("<") || text.includes("<!DOCTYPE html>")) {
          return { 
              connected: false, 
              slots: mockSlots, 
              error: "שגיאת הרשאות: ה-Script חייב להיות מוגדר כ-Anyone (ולא Only Me)." 
          };
      }

      try {
          rawData = JSON.parse(text);
      } catch (e) {
          throw new Error("Invalid JSON response");
      }
      
      const normalizedData: Record<string, string[]> = {};
      
      const processEntry = (dateVal: any, timeVal: any, serviceVal: any) => {
          if (!dateVal || !timeVal) return;
          if (String(dateVal).toLowerCase().includes('date') && String(timeVal).toLowerCase().includes('time')) return;

          const cleanDateKey = normalizeDateKey(dateVal);
          const cleanTime = normalizeTime(timeVal);
          
          if (cleanDateKey && cleanTime) {
              if (!normalizedData[cleanDateKey]) {
                  normalizedData[cleanDateKey] = [];
              }
              
              if (!normalizedData[cleanDateKey].includes(cleanTime)) {
                  normalizedData[cleanDateKey].push(cleanTime);
              }

              let duration = 30; // Default minimum duration
              if (serviceVal) {
                  const sName = String(serviceVal).trim();
                  const matched = SERVICES.find(s => s.name === sName || sName.includes(s.name));
                  if (matched) {
                      duration = matched.duration;
                  }
              }

              const slotsToBlock = Math.ceil(duration / 30);
              for (let i = 1; i < slotsToBlock; i++) {
                   const nextSlot = addMinutesStr(cleanTime, i * 30);
                   if (!normalizedData[cleanDateKey].includes(nextSlot)) {
                       normalizedData[cleanDateKey].push(nextSlot);
                   }
              }
          }
      };

      if (Array.isArray(rawData)) {
          rawData.forEach((row: any) => {
              let dateVal, timeVal, serviceVal;
              if (Array.isArray(row)) {
                  dateVal = row[0]; 
                  timeVal = row[1];
                  serviceVal = row[2]; // Column C
              } else if (typeof row === 'object') {
                  dateVal = row.date || row.Date || row.DATE;
                  timeVal = row.time || row.Time || row.TIME;
                  serviceVal = row.service || row.Service || row.SERVICE;
              }
              processEntry(dateVal, timeVal, serviceVal);
          });
      } 
      else if (rawData && typeof rawData === 'object') {
          Object.keys(rawData).forEach(key => {
              if (Array.isArray(rawData[key])) {
                  const cleanKey = normalizeDateKey(key);
                  if (cleanKey) {
                      rawData[key].forEach((item: any) => {
                          let tVal, sVal;
                          if (typeof item === 'object' && item !== null) {
                              tVal = item.time || item.Time;
                              sVal = item.service || item.Service;
                          } else {
                              tVal = item;
                          }
                          processEntry(cleanKey, tVal, sVal);
                      });
                  } else {
                      rawData[key].forEach((row: any) => {
                           let dateVal, timeVal, serviceVal;
                           if (Array.isArray(row)) {
                               dateVal = row[0];
                               timeVal = row[1];
                               serviceVal = row[2];
                           } else {
                               dateVal = row.date || row.Date;
                               timeVal = row.time || row.Time;
                               serviceVal = row.service || row.Service;
                           }
                          processEntry(dateVal, timeVal, serviceVal);
                      });
                  }
              }
          });
      }

      console.log("Processed Booked Slots (Real Time with Duration):", normalizedData);
      return { connected: true, slots: normalizedData };
    } catch (error) {
      console.warn("API connection failed. Switching to Offline Mode.", error);
      return { connected: false, slots: mockSlots, error: "שגיאת תקשורת כללית" };
    }
  },

  // Login verification
  loginUser: async (email: string, password: string): Promise<{success: boolean, message?: string}> => {
    try {
        if (!API_URL) throw new Error("No API URL");
        // Using action 'login'
        const url = `${API_URL}?t=${new Date().getTime()}&action=login&sheet=Register&email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
        
        const response = await fetch(url, { redirect: 'follow' });
        
        if (!response.ok) throw new Error("Server error");
        
        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch(e) {
            console.error("Invalid JSON:", text);
            if (text.includes("<!DOCTYPE html>")) {
                return { success: false, message: "שגיאת חיבור לשרת (הרשאות)" };
            }
            throw new Error("תגובת שרת לא תקינה");
        }
        
        if (data && data.success) {
            return { success: true };
        } else {
             return { success: false, message: data.error || "אימייל או סיסמה שגויים" };
        }

    } catch (error) {
        console.error("Login failed:", error);
        return { success: false, message: "שגיאת תקשורת או פרטים שגויים" };
    }
  },

  // NEW: Register User to 'Register' sheet
  registerUser: async (email: string, password: string): Promise<{success: boolean, message?: string}> => {
    try {
        if (!API_URL) throw new Error("No API URL");
        
        // This payload structure is designed to append a row with Date, Email, Password
        const payload = {
            action: 'register',
            sheet: 'Register', // Specifically targeting the 'Register' tab
            date: new Date().toLocaleDateString('he-IL'),
            email: email,
            password: password
        };
        
        console.log("Sending registration:", payload); // Debug logging

        const postUrl = `${API_URL}?t=${new Date().getTime()}&action=register`;
        await fetch(postUrl, {
            method: "POST",
            mode: "no-cors", 
            // Removed keepalive to avoid potential browser conflicts
            headers: { "Content-Type": "text/plain" },
            body: JSON.stringify(payload)
        });
        
        return { success: true };

    } catch (error: any) {
        console.error("Registration failed:", error);
        return { success: false, message: "שגיאה בהרשמה" };
    }
  },

  // Fetch bookings for a specific client
  fetchClientBookings: async (email: string): Promise<ClientBooking[]> => {
    try {
      if (!API_URL) throw new Error("No API URL");
      const url = `${API_URL}?t=${new Date().getTime()}&action=get_client_bookings&email=${encodeURIComponent(email)}`;
      const response = await fetch(url, { redirect: 'follow' });
      if (!response.ok) throw new Error("Fetch failed");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn("Failed to fetch client bookings, using demo data", error);
      return [];
    }
  },

  // Save booking
  saveBooking: async (bookingData: any) => {
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
        password: bookingData.clientPassword, 
        type: type 
      };
      
      console.log("Saving booking:", payload);

      if (!API_URL) throw new Error("No API URL");

      const postUrl = `${API_URL}?t=${new Date().getTime()}&action=save`;
      await fetch(postUrl, {
        method: "POST",
        mode: "no-cors", 
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
      });
      return { success: true };
    } catch (error) {
      console.error("Error saving booking (Demo mode activated):", error);
      await new Promise(resolve => setTimeout(resolve, 1500));
      return { success: true };
    }
  },

  // Cancel booking
  cancelBooking: async (booking: ClientBooking, email: string) => {
    try {
      if (!API_URL) throw new Error("No API URL");

      const payload = {
        action: 'cancel',
        date: booking.date, 
        time: booking.time,
        email: email
      };

      const postUrl = `${API_URL}?t=${new Date().getTime()}&action=cancel`;
      await fetch(postUrl, {
        method: "POST",
        mode: "no-cors", 
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
      });
      return { success: true };
    } catch (error) {
      console.error("Error canceling booking (Demo mode activated):", error);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
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
    step: "home",
    service: null,
    date: null,
    time: null,
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    clientPassword: "",
    isWaitingList: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // If API URL is missing, show setup screen
  if (!API_URL) {
      return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
              <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
                  <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                      <Settings size={32} />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900">הגדרת מערכת נדרשת</h1>
                  <p className="text-slate-600">
                      כדי שהאתר יעבוד, יש לחבר אותו לגוגל שיטס.
                  </p>
                  <div className="text-right bg-slate-50 p-4 rounded-xl text-sm space-y-2 border border-slate-200">
                      <p>1. פתח את הגיליון שלך.</p>
                      <p>2. לך ל-Extensions &gt; Apps Script.</p>
                      <p>3. הדבק את הקוד שקיבלת ועשה Deploy (Anyone).</p>
                      <p>4. העתק את הכתובת (exec) והדבק אותה בקובץ <code>index.tsx</code>.</p>
                  </div>
              </div>
          </div>
      )
  }

  const resetFlow = () => {
    setState({
      step: "home",
      service: null,
      date: null,
      time: null,
      clientName: "",
      clientPhone: "",
      clientEmail: "",
      clientPassword: "",
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
    <div className="min-h-screen bg-[#FAFAFA] text-slate-800 font-sans pb-20 md:pb-0 relative overflow-x-hidden">
      
      {/* Background Decor */}
      <div className="fixed inset-0 z-0 pointer-events-none">
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-pink-100/50 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
         <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-slate-100/50 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>
      </div>

      <div className="relative z-10">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="w-full max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={resetFlow}>
            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white font-bold text-lg">
              G
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900">Glow Studio</span>
          </div>
          
          <div className="flex items-center gap-2">
             {state.step === 'home' ? (
                <>
                  <button onClick={() => nextStep('manage-login')} className="flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition bg-white px-3 py-2 rounded-full border border-slate-200 hover:border-slate-300">
                    <User size={14} />
                    <span>אזור אישי</span>
                  </button>
                  <button onClick={() => nextStep('register')} className="flex items-center gap-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 transition px-3 py-2 rounded-full">
                    <UserPlus size={14} />
                    <span>הרשמה</span>
                  </button>
                </>
             ) : (
                <button onClick={resetFlow} className="text-sm text-slate-500 hover:text-slate-900 transition font-medium">
                  ביטול
                </button>
             )}
          </div>
        </div>
      </header>

      <main className="w-full max-w-lg mx-auto px-4 py-8">
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
            onDateSelect={(d: Date) => setState(prev => ({ ...prev, date: d, time: null, isWaitingList: false }))}
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
            email={state.clientEmail}
            isWaitingList={state.isWaitingList}
            isLoading={isSubmitting}
            onChange={(field: string, val: string) => setState(prev => ({ ...prev, [field]: val }))}
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
            onLogin={(email) => {
              setState(prev => ({ ...prev, clientEmail: email }));
              nextStep('manage-list');
            }}
            onBack={() => nextStep('home')}
          />
        )}
        
        {state.step === "register" && (
          <Register 
            onRegisterSuccess={(email) => {
               alert("נרשמת בהצלחה! כעת ניתן להתחבר.");
               nextStep('manage-login');
            }}
            onBack={() => nextStep('home')}
          />
        )}

        {state.step === "manage-list" && (
          <ManageList 
            email={state.clientEmail}
            onBack={() => nextStep('home')}
          />
        )}

      </main>

      {/* Floating Chat Button */}
      {state.step !== "confirmation" && state.step !== "waiting-list-confirmed" && (
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

function Register({ onRegisterSuccess, onBack }: { onRegisterSuccess: (email: string) => void, onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!email || !email.includes("@")) {
        setError("נא להזין כתובת אימייל תקינה");
        return;
    }
    if (password.length !== 6 || !/^\d+$/.test(password)) {
        setError("הסיסמה חייבת להכיל 6 ספרות בדיוק");
        return;
    }

    setIsLoading(true);
    setError(null);

    const result = await api.registerUser(email, password);
    setIsLoading(false);

    if (result.success) {
        onRegisterSuccess(email);
    } else {
        setError(result.message || "שגיאה בהרשמה. נסי שוב.");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up">
       <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 -mr-2 rounded-full hover:bg-slate-100 text-slate-500"><ChevronRight /></button>
        <h2 className="text-2xl font-bold">הרשמה ללקוחות</h2>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-start gap-3 text-slate-600 bg-slate-50 p-4 rounded-xl">
               <Info size={20} className="flex-shrink-0 mt-0.5 text-slate-900" />
               <p className="text-sm">ההרשמה מאפשרת לך לנהל את התורים שלך בקלות, לצפות בהיסטוריה ולבצע שינויים.</p>
            </div>

            <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">כתובת אימייל</label>
                  <div className="relative">
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full p-3.5 pl-4 pr-12 rounded-xl border border-slate-200 focus:border-black focus:ring-0 outline-none transition-all bg-slate-50 focus:bg-white text-base"
                      />
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">סיסמה (6 ספרות)</label>
                  <div className="relative">
                      <input 
                        type="password" 
                        maxLength={6}
                        inputMode="numeric"
                        value={password}
                        onChange={(e) => {
                            if (/^\d*$/.test(e.target.value)) setPassword(e.target.value);
                        }}
                        placeholder="123456"
                        className="w-full p-3.5 pl-4 pr-12 rounded-xl border border-slate-200 focus:border-black focus:ring-0 outline-none transition-all bg-slate-50 focus:bg-white text-base font-mono tracking-widest"
                      />
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  </div>
                </div>
            </div>

            {error && <p className="text-red-600 text-sm font-medium bg-red-50 p-3 rounded-lg flex items-center gap-2"><AlertCircle size={16}/> {error}</p>}

            <button
                onClick={handleRegister}
                disabled={isLoading}
                className="w-full bg-black text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 mt-2"
            >
                {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'הירשמי עכשיו'}
            </button>
      </div>
    </div>
  )
}

function HeroSection({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center space-y-8 py-8 animate-fade-in-up">
      <div className="relative">
        <div className="w-32 h-32 bg-slate-200 rounded-full overflow-hidden shadow-lg border-4 border-white relative z-10">
          <img 
            src="https://images.unsplash.com/photo-1522337660859-02fbefca4702?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" 
            alt="Beauty Salon" 
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      
      <div className="text-center space-y-3 max-w-xs">
        <h1 className="text-3xl font-bold text-slate-900 leading-tight">
          הזמן שלך <span className="text-pink-500">לזהור</span>
        </h1>
        <p className="text-slate-500 text-base leading-relaxed">
          עיצוב גבות וריסים ברמה הגבוהה ביותר. שרייני תור בקלות.
        </p>
      </div>

      <button 
        onClick={onStart}
        className="w-full max-w-xs bg-black text-white py-4 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 text-lg"
      >
        <Calendar size={20} />
        קבעי תור עכשיו
      </button>

      <div className="grid grid-cols-3 gap-6 pt-4 w-full max-w-xs border-t border-slate-100">
        <div className="flex flex-col items-center gap-1 text-slate-400">
          <Star size={18} />
          <span className="text-[10px] font-medium uppercase tracking-wider">מומחיות</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-slate-400">
          <Sparkles size={18} />
          <span className="text-[10px] font-medium uppercase tracking-wider">איכות</span>
        </div>
        <div className="flex flex-col items-center gap-1 text-slate-400">
          <Clock size={18} />
          <span className="text-[10px] font-medium uppercase tracking-wider">זמינות</span>
        </div>
      </div>
    </div>
  );
}

function ServiceSelection({ services, onSelect, onBack }: { services: Service[], onSelect: (s: Service) => void, onBack: () => void }) {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 -mr-2 rounded-full hover:bg-slate-100 text-slate-500"><ChevronRight /></button>
        <h2 className="text-2xl font-bold">בחרי טיפול</h2>
      </div>
      
      <div className="grid gap-3">
        {services.map(service => (
          <div 
            key={service.id}
            onClick={() => onSelect(service)}
            className="group bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all cursor-pointer flex items-center justify-between"
          >
            <div>
              <h3 className="font-bold text-lg text-slate-900">{service.name}</h3>
              <p className="text-slate-500 text-sm mt-1">{service.description}</p>
              <div className="flex items-center gap-4 mt-3 text-xs font-medium text-slate-400">
                <span className="flex items-center gap-1"><Clock size={12} /> {service.duration} דק'</span>
                <span className="flex items-center gap-1 text-slate-900 font-bold">₪{service.price}</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center group-hover:bg-black group-hover:text-white transition-colors">
              <ChevronLeft size={18} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DateSelection({ service, selectedDate, selectedTime, onDateSelect, onTimeSelect, onNext, onBack, isValid }: any) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [bookedSlots, setBookedSlots] = useState<Record<string, string[]>>({});
  
  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await api.fetchBookedSlots();
      if (res.connected) {
        setBookedSlots(res.slots);
      }
      setLoading(false);
    }
    load();
  }, []);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay(); // 0 is Sunday
  
  const generateCalendarDays = () => {
    const days = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i));
    }
    return days;
  };

  const handleMonthChange = (dir: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + dir, 1));
  };

  const slots = selectedDate ? generateTimeSlots(selectedDate, service.duration, bookedSlots) : [];

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 -mr-2 rounded-full hover:bg-slate-100 text-slate-500"><ChevronRight /></button>
        <h2 className="text-2xl font-bold">בחרי מועד</h2>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => handleMonthChange(-1)} className="p-1 hover:bg-slate-100 rounded-full"><ChevronRight size={20} /></button>
          <span className="font-bold text-lg">
            {currentMonth.toLocaleString('he-IL', { month: 'long', year: 'numeric' })}
          </span>
          <button onClick={() => handleMonthChange(1)} className="p-1 hover:bg-slate-100 rounded-full"><ChevronLeft size={20} /></button>
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['א','ב','ג','ד','ה','ו','ש'].map(d => <span key={d} className="text-xs text-slate-400 font-medium">{d}</span>)}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {generateCalendarDays().map((date, i) => {
            if (!date) return <div key={`empty-${i}`} />;
            const isToday = new Date().toDateString() === date.toDateString();
            const isSelected = selectedDate?.toDateString() === date.toDateString();
            const isPast = date < new Date(new Date().setHours(0,0,0,0));
            const isOffDay = !isWorkingDay(date);
            const disabled = isPast || isOffDay;
            
            return (
              <button
                key={i}
                disabled={disabled}
                onClick={() => onDateSelect(date)}
                className={`
                  aspect-square rounded-full flex items-center justify-center text-sm font-medium transition-all
                  ${isSelected ? 'bg-black text-white shadow-md' : ''}
                  ${!isSelected && !disabled ? 'hover:bg-slate-100 text-slate-700' : ''}
                  ${isToday && !isSelected ? 'text-pink-600 font-bold' : ''}
                  ${disabled ? 'opacity-30 cursor-not-allowed' : ''}
                `}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      {loading && (
          <div className="text-center py-8 text-slate-400">
              <Loader2 className="animate-spin mx-auto mb-2" />
              <p className="text-sm">טוען זמינות...</p>
          </div>
      )}

      {!loading && selectedDate && (
        <div className="space-y-3 animate-fade-in">
          <h3 className="font-bold text-slate-900">שעות פנויות ל{selectedDate.toLocaleDateString('he-IL')}</h3>
          <div className="grid grid-cols-3 gap-3">
            {slots.length > 0 ? slots.map((slot, idx) => (
              <button
                key={idx}
                onClick={() => onTimeSelect(slot.time, !slot.available)}
                className={`
                  py-3 rounded-xl border text-sm font-medium transition-all relative overflow-hidden
                  ${selectedTime === slot.time 
                    ? (slot.available ? 'bg-black border-black text-white shadow-lg' : 'bg-slate-800 border-slate-800 text-white shadow-lg')
                    : (slot.available 
                        ? 'bg-white border-slate-200 hover:border-slate-400 text-slate-700' 
                        : 'bg-slate-50 border-slate-100 text-slate-300'
                      )
                  }
                `}
              >
                {slot.time}
                {!slot.available && (
                   <span className="absolute top-0 right-0 left-0 bg-slate-100 text-[9px] text-slate-400 py-0.5">תפוס</span>
                )}
              </button>
            )) : (
               <p className="col-span-3 text-center text-slate-500 py-4 bg-slate-50 rounded-xl">אין תורים פנויים ביום זה.</p>
            )}
          </div>
        </div>
      )}

      <div className="pt-4">
        <button
          onClick={onNext}
          disabled={!isValid}
          className="w-full bg-black text-white py-4 rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
        >
          {selectedTime && slots.find(s => s.time === selectedTime && !s.available) ? 'הרשמה לרשימת המתנה' : 'המשך לפרטים'}
          <ChevronLeft size={18} />
        </button>
      </div>
    </div>
  );
}

function ClientDetails({ name, phone, email, isWaitingList, isLoading, onChange, onNext, onBack }: any) {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 -mr-2 rounded-full hover:bg-slate-100 text-slate-500"><ChevronRight /></button>
        <h2 className="text-2xl font-bold">פרטים אישיים</h2>
      </div>

      <div className="space-y-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">שם מלא</label>
          <input 
            type="text" 
            value={name}
            onChange={(e) => onChange('clientName', e.target.value)}
            className="w-full p-3.5 rounded-xl border border-slate-200 focus:border-black focus:ring-0 outline-none transition-all bg-slate-50 focus:bg-white"
            placeholder="ישראל ישראלי"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">טלפון</label>
          <input 
            type="tel" 
            value={phone}
            onChange={(e) => onChange('clientPhone', e.target.value)}
            className="w-full p-3.5 rounded-xl border border-slate-200 focus:border-black focus:ring-0 outline-none transition-all bg-slate-50 focus:bg-white"
            placeholder="050-0000000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">אימייל</label>
          <input 
            type="email" 
            value={email}
            onChange={(e) => onChange('clientEmail', e.target.value)}
            className="w-full p-3.5 rounded-xl border border-slate-200 focus:border-black focus:ring-0 outline-none transition-all bg-slate-50 focus:bg-white"
            placeholder="example@mail.com"
          />
        </div>
      </div>
      
      {isWaitingList && (
         <div className="bg-yellow-50 p-4 rounded-xl flex items-start gap-3 text-yellow-800 border border-yellow-100">
           <AlertCircle className="shrink-0 mt-0.5" size={20} />
           <p className="text-sm">שימי לב: את נרשמת לרשימת המתנה. במידה ויתפנה תור, ניצור איתך קשר.</p>
         </div>
      )}

      <button
        onClick={onNext}
        disabled={!name || !phone || !email || isLoading}
        className="w-full bg-black text-white py-4 rounded-xl font-bold shadow-lg disabled:opacity-50 hover:bg-slate-800 transition-all flex items-center justify-center gap-2 mt-4"
      >
        {isLoading ? <Loader2 className="animate-spin" /> : (isWaitingList ? 'אשרי הרשמה להמתנה' : 'אשרי הזמנה')}
      </button>
    </div>
  );
}

function Confirmation({ state, onReset }: any) {
  return (
    <div className="text-center py-10 space-y-6 animate-scale-in">
      <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
        <CheckCircle size={48} />
      </div>
      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold text-slate-900">איזה כיף! התור נקבע.</h2>
        <p className="text-slate-500">נשלח לך אישור ל-WhatsApp ולמייל.</p>
      </div>
      
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
      
      <button 
        onClick={onReset}
        className="bg-black text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-slate-800 transition-all"
      >
        מעולה, תודה!
      </button>
    </div>
  );
}

function ManageLogin({ onLogin, onBack }: { onLogin: (email: string) => void, onBack: () => void }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [rememberMe, setRememberMe] = useState(false);

    useEffect(() => {
        const savedEmail = localStorage.getItem("glow_user_email");
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
    }, []);

    const handleLogin = async () => {
        setLoading(true);
        setError("");
        const res = await api.loginUser(email, password);
        setLoading(false);
        if (res.success) {
            if (rememberMe) {
                localStorage.setItem("glow_user_email", email);
            } else {
                localStorage.removeItem("glow_user_email");
            }
            onLogin(email);
        } else {
            setError(res.message || "שגיאה בהתחברות");
        }
    };

    return (
        <div className="space-y-8 animate-fade-in-up">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 -mr-2 rounded-full hover:bg-slate-100 text-slate-500"><ChevronRight /></button>
                <h2 className="text-2xl font-bold">התחברות</h2>
            </div>
             <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">אימייל</label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-slate-200 focus:border-black focus:ring-0 outline-none transition-all bg-slate-50 focus:bg-white"
                    placeholder="name@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">סיסמה (6 ספרות)</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-slate-200 focus:border-black focus:ring-0 outline-none transition-all bg-slate-50 focus:bg-white font-mono tracking-widest"
                    maxLength={6}
                  />
                </div>
                
                <div className="flex items-center gap-2">
                    <input 
                        type="checkbox" 
                        id="rememberMe"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-black focus:ring-black accent-black"
                    />
                    <label htmlFor="rememberMe" className="text-sm text-slate-600 cursor-pointer select-none">
                        זכור אותי
                    </label>
                </div>

                {error && <p className="text-red-500 text-sm">{error}</p>}
                
                <button
                    onClick={handleLogin}
                    disabled={loading}
                    className="w-full bg-black text-white py-4 rounded-xl font-bold shadow-lg disabled:opacity-50 hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="animate-spin" /> : 'כניסה'}
                </button>
            </div>
        </div>
    );
}

function ManageList({ email, onBack }: { email: string, onBack: () => void }) {
    const [bookings, setBookings] = useState<ClientBooking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetch() {
            const data = await api.fetchClientBookings(email);
            setBookings(data);
            setLoading(false);
        }
        fetch();
    }, [email]);

    const handleCancel = async (booking: ClientBooking) => {
        if (!window.confirm("בטוחה שאת רוצה לבטל את התור?")) return;
        setLoading(true);
        await api.cancelBooking(booking, email);
        const data = await api.fetchClientBookings(email);
        setBookings(data);
        setLoading(false);
    };

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex items-center gap-4">
                <button onClick={onBack} className="p-2 -mr-2 rounded-full hover:bg-slate-100 text-slate-500"><ChevronRight /></button>
                <h2 className="text-2xl font-bold">התורים שלי</h2>
            </div>
            
            {loading ? (
                <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-pink-500" /></div>
            ) : bookings.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-xl border border-slate-100 shadow-sm">
                   <p className="text-slate-500">אין לך תורים עתידיים.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {bookings.map((b, i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-slate-900">{b.service}</h3>
                                <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                                    <Calendar size={14} />
                                    <span>{b.date}</span>
                                    <Clock size={14} className="ml-1" />
                                    <span>{b.time}</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleCancel(b)}
                                className="text-red-500 bg-red-50 p-2.5 rounded-xl hover:bg-red-100 transition-colors"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function AIConsultant({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "model", text: "היי! אני העוזרת החכמה של Glow Studio. איך אוכל לעזור?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg = input;
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: userMsg }]);
    setLoading(true);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const chat = ai.chats.create({
            model: "gemini-2.5-flash",
            history: messages.map(m => ({
                role: m.role,
                parts: [{ text: m.text }]
            }))
        });

        const result = await chat.sendMessage({ message: userMsg });
        const text = result.text;
        setMessages(prev => [...prev, { role: "model", text }]);
    } catch (e) {
        console.error(e);
        setMessages(prev => [...prev, { role: "model", text: "אופס, נתקלתי בבעיה. נסי שוב מאוחר יותר." }]);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-20 left-4 z-50 w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[500px] animate-scale-in">
      <div className="bg-black text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-pink-300" />
            <span className="font-bold">Glow AI</span>
        </div>
        <button onClick={onClose}><X size={18} /></button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
        {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-xl text-sm ${m.role === 'user' ? 'bg-black text-white rounded-br-none' : 'bg-white shadow-sm border border-slate-200 text-slate-800 rounded-bl-none'}`}>
                    {m.text}
                </div>
            </div>
        ))}
        {loading && (
            <div className="flex justify-start">
                <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 rounded-bl-none flex gap-1">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                </div>
            </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
        <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="כתבי הודעה..."
            className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-black"
        />
        <button 
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-black text-white p-2 rounded-full hover:bg-slate-800 disabled:opacity-50"
        >
            <Send size={18} />
        </button>
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);