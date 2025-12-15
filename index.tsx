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
  Lock
} from "lucide-react";

// --- Configuration ---

// ============================================================================
// 👇 כאן להדביק את הכתובת שקיבלת בשלב ה-Deploy (סיומת /exec) 👇
// ============================================================================
const API_URL = "https://script.google.com/macros/s/AKfycbwYEoQI9puEnBt95qNPFJidaxpAZ2BWkMiE0Wnh03YLhNxqyV_Tp4oVC6pXSaKd8esR/exec"; 

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

// Aggressive time normalizer to handle "9:00", "09:00", "9:00:00", "1899-12-30T09:00..."
const normalizeTime = (t: any): string | null => {
    if (!t) return null;
    let s = String(t).trim();
    
    // 1. Handle ISO/Date strings first (Timezone correction)
    // Google Sheets JSON often returns times as full ISO strings (e.g. 1899-12-30T09:00:00.000Z)
    // We must parse these as Dates to get the local time (e.g. 11:00 IL) instead of the UTC time (09:00).
    if (s.includes('T') || s.match(/^\d{4}-/)) {
        const d = new Date(s);
        if (!isNaN(d.getTime())) {
            return formatTime(d);
        }
    }

    // 2. Fallback to Regex for simple HH:MM strings
    const match = s.match(/(\d{1,2}):(\d{2})/);
    if (match) {
        let h = match[1].padStart(2, '0');
        let m = match[2];
        return `${h}:${m}`;
    }
    return null;
}

// Aggressive date key cleaner to handle various formats from Sheets
const normalizeDateKey = (k: any): string => {
    if (!k) return "";
    let dateStr = String(k).trim();
    
    // 1. Handle ISO strings with time components (T or Z) FIRST.
    // This is crucial because Google Sheets often returns dates as ISO strings at UTC midnight (or shifted).
    // If we simply regex the first 10 chars, we might get the previous day (e.g. 2025-12-14T22:00:00.000Z is 15th in Israel).
    // We rely on the browser's local timezone to convert it back to the correct date.
    if (dateStr.includes('T') || dateStr.includes('Z')) {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            return getDateKey(d);
        }
    }

    // 2. Check for specific "YYYY-MM-DD" format (without time).
    // If it's just a date string, we take it as is to avoid timezone shifts on pure dates.
    const isoDateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (isoDateMatch) {
       return `${isoDateMatch[1]}-${isoDateMatch[2]}-${isoDateMatch[3]}`;
    }

    // 3. Check for "DD/MM/YYYY" or "DD.MM.YYYY" or "DD-MM-YYYY"
    // Supports 2 digit years (e.g. 15/12/25)
    const ilMatch = dateStr.match(/^(\d{1,2})[/. -](\d{1,2})[/. -](\d{2,4})/);
    if (ilMatch) {
       const day = ilMatch[1].padStart(2, '0');
       const month = ilMatch[2].padStart(2, '0');
       let year = ilMatch[3];
       if (year.length === 2) year = '20' + year;
       return `${year}-${month}-${day}`;
    }

    // 4. Fallback: Generic Date object parsing
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

  // DEBUG TOOL: Fetch raw data to inspect rows
  debugFetchRaw: async (): Promise<any> => {
    if (!API_URL) return { error: "No API URL" };
    try {
        const response = await fetch(`${API_URL}?t=${Date.now()}&action=get_slots`, {
            method: 'GET',
            redirect: 'follow'
        });
        if (!response.ok) return { error: `HTTP ${response.status}` };
        const json = await response.json();
        return json;
    } catch (e: any) {
        return { error: e.message };
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
              
              // 1. Mark the start time
              if (!normalizedData[cleanDateKey].includes(cleanTime)) {
                  normalizedData[cleanDateKey].push(cleanTime);
              }

              // 2. Check Service Duration (Column C) and mark overlapping slots
              // This is crucial for correctly blocking subsequent slots based on existing data
              let duration = 30; // Default minimum duration
              if (serviceVal) {
                  const sName = String(serviceVal).trim();
                  const matched = SERVICES.find(s => s.name === sName || sName.includes(s.name));
                  if (matched) {
                      duration = matched.duration;
                  }
              }

              // If duration > 30, block subsequent 30-min slots
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
                  // Direct Access: Col A (0), Col B (1), Col C (2)
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

  // Fetch bookings for a specific client (by phone)
  fetchClientBookings: async (phone: string): Promise<ClientBooking[]> => {
    try {
      if (!API_URL) throw new Error("No API URL");
      const url = `${API_URL}?t=${new Date().getTime()}&action=get_client_bookings&phone=${phone}`;
      const response = await fetch(url, { redirect: 'follow' });
      if (!response.ok) throw new Error("Fetch failed");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn("Failed to fetch client bookings, using demo data", error);
      return [
        { 
          date: getDateKey(new Date()), 
          time: "10:00", 
          service: "עיצוב גבות (דמו)", 
          name: "לקוחה לדוגמה" 
        }
      ];
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
        type: type 
      };

      if (!API_URL) throw new Error("No API URL");

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
      console.error("Error saving booking (Demo mode activated):", error);
      await new Promise(resolve => setTimeout(resolve, 1500));
      return { success: true };
    }
  },

  // Cancel booking
  cancelBooking: async (booking: ClientBooking, phone: string) => {
    try {
      if (!API_URL) throw new Error("No API URL");

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
  // bookedTimes now contains all 30-min blocks that are occupied by existing appointments
  const bookedTimes = new Set(bookedSlotsMap[dateKey] || []);

  while (current < endTime) {
    // Calculate when the NEW requested service would end
    const serviceEnd = new Date(current.getTime() + durationMinutes * 60000);
    
    // Only proceed if the service fits within business hours
    if (serviceEnd <= endTime) {
      const timeString = formatTime(current);
      
      let isBlocked = false;
      // Determine how many 30-minute slots the NEW service requires
      const slotsNeeded = Math.ceil(durationMinutes / 30);
      
      // Check if ALL required slots for the new service are free
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
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [timer, setTimer] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Tools for debugging connection (keeping existing logic)
  const [testStatus, setTestStatus] = useState<{loading: boolean, msg: string, success?: boolean} | null>(null);
  const [debugData, setDebugData] = useState<any>(null);
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    let interval: any;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleSendCode = async () => {
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) return;

    setIsLoading(true);
    setError(null);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setIsLoading(false);
    setStep('otp');
    setTimer(60);
    // Focus first input after render
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
    
    // In production, this would trigger an SMS via backend
    alert(`קוד האימות שלך הוא: 1234`); 
  };

  const handleVerify = async () => {
    const code = otp.join("");
    if (code.length !== 4) {
        setError("נא להזין 4 ספרות");
        return;
    }

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);

    if (code === "1234") {
        onLogin(phone);
    } else {
        setError("קוד שגוי, נסי שוב");
        setOtp(["", "", "", ""]);
        inputRefs.current[0]?.focus();
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError(null);

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
    
    // Auto verify on last digit? Maybe better to let them click button or enter.
    if (index === 3 && value) {
        // Optional: trigger verify automatically
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter' && index === 3) {
        handleVerify();
    }
  };

  const handleTest = async () => {
    setTestStatus({ loading: true, msg: "בודק חיבור..." });
    const result = await api.testConnection();
    setTestStatus({ loading: false, msg: result.message, success: result.success });
    setTimeout(() => { if (result.success) setTestStatus(null); }, 5000);
  };

  const handleDebugFetch = async () => {
     setDebugData("loading...");
     const data = await api.debugFetchRaw();
     setDebugData(data);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
       <div className="flex items-center gap-4">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-white/50"><ChevronRight /></button>
        <h2 className="text-2xl font-bold">ניהול תורים</h2>
      </div>

      {step === 'phone' ? (
        <div className="space-y-6">
            <div className="bg-white/60 p-4 rounded-xl flex items-center gap-3 text-pink-800 border border-pink-100 shadow-sm">
               <Info size={20} className="flex-shrink-0" />
               <p className="text-sm">הזיני את מספר הטלפון איתו נרשמת כדי לקבל קוד גישה חד פעמי.</p>
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

            <button
                onClick={handleSendCode}
                disabled={phone.replace(/\D/g, '').length !== 10 || isLoading}
                className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-lg disabled:opacity-50 hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
            >
                {isLoading && <Loader2 className="animate-spin" size={20} />}
                {isLoading ? 'שולח קוד...' : 'שלחי לי קוד ב-SMS'}
            </button>
        </div>
      ) : (
        <div className="space-y-8 text-center">
             <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">הזיני את הקוד שקיבלת</h3>
                <p className="text-slate-500 text-sm">קוד נשלח למספר <span dir="ltr">{phone}</span></p>
                <button onClick={() => setStep('phone')} className="text-xs text-pink-600 font-medium hover:underline">שינוי מספר טלפון</button>
             </div>

             <div className="flex gap-3 justify-center" dir="ltr">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => { inputRefs.current[idx] = el }}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className={`w-14 h-14 text-center text-2xl font-bold rounded-xl border outline-none transition-all bg-white shadow-sm ${
                      error ? 'border-red-300 ring-1 ring-red-200' : 'border-slate-200 focus:border-pink-500 focus:ring-1 focus:ring-pink-500'
                  }`}
                />
              ))}
            </div>

            {error && <p className="text-red-500 text-sm font-medium animate-pulse">{error}</p>}

            <div className="space-y-4">
                 <button
                    onClick={handleVerify}
                    disabled={isLoading}
                    className="w-full bg-pink-500 text-white py-4 rounded-xl font-bold shadow-lg disabled:opacity-50 hover:bg-pink-600 transition-colors flex items-center justify-center gap-2"
                >
                    {isLoading && <Loader2 className="animate-spin" size={20} />}
                    {isLoading ? 'מאמת...' : 'כניסה למערכת'}
                </button>

                <div className="text-sm">
                    {timer > 0 ? (
                        <p className="text-slate-400 flex items-center justify-center gap-1">
                            <Clock size={14} />
                            ניתן לשלוח קוד שוב בעוד {timer} שניות
                        </p>
                    ) : (
                        <button onClick={handleSendCode} className="text-slate-800 font-bold hover:text-pink-600 transition-colors">
                            לא קיבלתי קוד? שלחי שוב
                        </button>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Debug Section (Bottom) */}
      <div className="pt-8 border-t border-slate-200 mt-8 space-y-4">
        <div className="flex gap-4 justify-center">
            <button 
                onClick={handleTest}
                disabled={testStatus?.loading}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition bg-slate-100 px-3 py-2 rounded-lg"
            >
                <Activity size={16} />
                {testStatus?.loading ? 'בודק...' : 'בדיקת חיבור (Ping)'}
            </button>
             <button 
                onClick={() => setShowDebug(!showDebug)}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-pink-600 transition bg-slate-100 px-3 py-2 rounded-lg"
            >
                <Database size={16} />
                בדיקת נתונים מתקדמת
            </button>
        </div>

        {testStatus && !testStatus.loading && (
            <p className={`text-center text-xs font-bold ${testStatus.success ? 'text-green-600' : 'text-red-500'}`}>
                {testStatus.msg}
            </p>
        )}

        {showDebug && (
            <div className="bg-slate-900 text-slate-200 p-4 rounded-xl text-left text-xs font-mono overflow-x-auto shadow-inner" dir="ltr">
                <div className="flex justify-between items-center mb-2 border-b border-slate-700 pb-2">
                    <span className="font-bold flex items-center gap-2"><Terminal size={14}/> DEBUG CONSOLE</span>
                    <button onClick={handleDebugFetch} className="bg-pink-600 text-white px-2 py-1 rounded hover:bg-pink-500">Fetch Raw Data</button>
                </div>
                
                {debugData === "loading..." ? (
                    <div className="text-yellow-400">Fetching data from Google Sheets...</div>
                ) : debugData ? (
                    <div>
                        <div className="text-green-400 mb-2">// Raw Response (First 5 Rows):</div>
                        {Array.isArray(debugData) ? (
                            <div className="space-y-1">
                                {debugData.slice(0, 5).map((row: any, i: number) => (
                                    <div key={i} className={i === 2 ? "bg-slate-800 p-1 rounded border border-yellow-500/50" : ""}>
                                        <span className="text-slate-500 mr-2">Row {i + 2} (Index {i}):</span>
                                        <span className="text-cyan-300">[{Array.isArray(row) ? row.join(", ") : JSON.stringify(row)}]</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <pre>{JSON.stringify(debugData, null, 2)}</pre>
                        )}
                    </div>
                ) : (
                    <div className="text-slate-500 italic">Click 'Fetch Raw Data' to inspect sheet contents.</div>
                )}
            </div>
        )}
      </div>
    </div>
  )
}

function ManageList({ phone, onBack }: { phone: string, onBack: () => void }) {
  const [bookings, setBookings] = useState<ClientBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState<string | null>(null);

  const loadBookings = async () => {
    setLoading(true);
    const data = await api.fetchClientBookings(phone);
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
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<Record<string, string[]>>({});
  const [retryCount, setRetryCount] = useState(0);

  // Poll for updates every 10 seconds (Constant updates)
  useEffect(() => {
    const interval = setInterval(() => {
        setRetryCount(prev => prev + 1);
    }, 5000); 
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      // Only show full loading spinner on first load
      if (retryCount === 0) setIsLoading(true);
      
      setConnectionError(null);
      const result = await api.fetchBookedSlots();
      if (mounted) {
        if (result.connected) {
          setBookedSlots(result.slots);
          // DEBUG LOG to verify keys
          console.log("Active Booked Slots Map:", result.slots);
          setConnectionError(null);
        } else {
          setConnectionError(result.error || "שגיאת תקשורת עם המערכת");
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
            <div>
                <h2 className="text-2xl font-bold leading-tight">מתי נוח לך?</h2>
                <p className="text-sm text-pink-600 font-medium">{service?.name}</p>
            </div>
        </div>
        
        <div className="flex items-center gap-2">
            {!isLoading && !connectionError && (
                 <span className="flex items-center gap-1.5 text-[10px] text-green-600 font-bold bg-green-50 px-3 py-1.5 rounded-full border border-green-100 shadow-sm">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Live
                 </span>
            )}
            <button 
                onClick={() => setRetryCount(c => c + 1)} 
                className="p-2 rounded-full hover:bg-white/50 text-slate-400"
                title="רענן נתונים כעת"
            >
                <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
            </button>
        </div>
      </div>

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
        
        {isLoading && retryCount === 0 ? (
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
                className={`relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all min-h-[70px] shadow-sm overflow-hidden ${
                    isSelected
                        ? isBooked
                             ? 'bg-orange-50 border-orange-400 ring-2 ring-orange-200 z-10'
                             : 'bg-slate-900 text-white border-slate-900 shadow-lg scale-105 z-10'
                        : isBooked
                            ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-pointer hover:bg-slate-100' 
                            : 'bg-white text-slate-700 border-white hover:border-pink-300 hover:shadow-md'
                }`}
                >
                <span className={`text-base font-bold relative z-10 ${isBooked ? 'line-through decoration-slate-300 decoration-2' : ''} ${isSelected && isBooked ? 'text-orange-700 decoration-orange-300' : ''}`}>
                  {slot.time}
                </span>
                
                {isBooked && !isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                         <X size={48} className="text-slate-800" strokeWidth={1} />
                    </div>
                )}
                
                {isBooked && (
                    <div className={`absolute -top-2 -left-2 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-white shadow-sm z-20 ${isSelected ? 'bg-orange-100 text-orange-700' : 'bg-slate-200 text-slate-500'}`}>
                      {isSelected ? <Clock size={10} /> : <X size={10} />}
                      {isSelected ? 'המתנה' : 'תפוס'}
                    </div>
                )}
                
                {isBooked && (
                   <span className={`text-[10px] font-medium mt-1 no-underline relative z-10 ${isSelected ? 'text-orange-600' : 'text-slate-400'}`}>
                       {isSelected ? 'להרשם להמתנה' : 'לחצי להמתנה'}
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
             <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start gap-3">
                <Info className="text-slate-400 flex-shrink-0 mt-1" size={16} />
                <div>
                    <h4 className="font-bold text-sm text-slate-700">מקרא זמינות</h4>
                    <p className="text-xs text-slate-500 mt-1">
                        שעות המסומנות ב-X הן שעות תפוסות. ניתן ללחוץ עליהן כדי להצטרף לרשימת ההמתנה.
                    </p>
                </div>
            </div>
        )}
      </div>

      <button
        onClick={onNext}
        disabled={!isValid || (isLoading && retryCount === 0)}
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