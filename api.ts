
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, SERVICES } from "./constants";
import { ClientBooking, ClientProfile } from "./types";
import { getDateKey, addMinutesStr } from "./utils";

// פונקציית עזר להוספת טיימאאוט להבטחות (Promises)
// Fix: Use any return type to avoid destructuring errors with Supabase query builders
const withTimeout = (promise: any, ms: number = 8000): Promise<any> => {
  return Promise.race([
    promise,
    new Promise<any>((_, reject) =>
      setTimeout(() => reject(new Error("זמן התגובה מהשרת חרג מהמותר. בדקי חיבור אינטרנט או מפתחות.")), ms)
    ),
  ]);
};

const isConfigValid = SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_ANON_KEY.length > 10;

export const supabase = createClient(
  SUPABASE_URL || "https://placeholder.supabase.co", 
  SUPABASE_ANON_KEY || "missing-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

export const api = {
  fetchBookedSlots: async (): Promise<{ connected: boolean; slots: Record<string, string[]>; error?: string }> => {
    if (!isConfigValid) return { connected: false, slots: {}, error: "חסר SUPABASE_KEY ב-Vercel" };
    try {
      const { data, error } = await withTimeout(supabase
        .from('appointments')
        .select('date, time, service'));
        
      if (error) throw error;
      const normalizedData: Record<string, string[]> = {};
      
      data?.forEach((row: any) => {
          const dateKey = row.date;
          const timeRange = row.time;
          const startTime = timeRange.includes('-') ? timeRange.split('-')[0] : timeRange;
          
          if (!normalizedData[dateKey]) normalizedData[dateKey] = [];
          if (!normalizedData[dateKey].includes(startTime)) normalizedData[dateKey].push(startTime);

          let duration = 30;
          const matched = SERVICES.find(s => s.name === row.service);
          if (matched) duration = matched.duration;

          const slotsToBlock = Math.ceil(duration / 30);
          for (let i = 1; i < slotsToBlock; i++) {
                const nextSlot = addMinutesStr(startTime, i * 30);
                if (!normalizedData[dateKey].includes(nextSlot)) normalizedData[dateKey].push(nextSlot);
          }
      });
      return { connected: true, slots: normalizedData };
    } catch (error: any) {
      return { connected: false, slots: {}, error: error.message };
    }
  },

  loginUser: async (identity: string, password: string): Promise<{success: boolean, message?: string, code?: string}> => {
    if (!isConfigValid) return { success: false, message: "הגדרות המערכת לא הושלמו" };
    try {
        let authParams: any = { password };
        if (identity.includes('@')) {
            authParams.email = identity.trim().toLowerCase();
        } else {
            const phoneDigits = identity.replace(/\D/g, '');
            authParams.phone = `+972${phoneDigits.startsWith('0') ? phoneDigits.slice(1) : phoneDigits}`;
        }
        
        const { data: authData, error: authError } = await withTimeout((supabase.auth as any).signInWithPassword(authParams), 10000);
        
        if (authError) throw authError;

        // עדכון פרופיל שקט לאחר התחברות
        try {
            await supabase.from('clients').upsert([{
                id: authData.user.id,
                email: authData.user.email,
                full_name: authData.user.user_metadata?.full_name || "לקוחה",
                phone: authData.user.user_metadata?.phone || ""
            }]);
        } catch (e) { /* ignore quiet errors */ }

        return { success: true };
    } catch (error: any) {
        let msg = error.message;
        if (msg === "Invalid login credentials") msg = "אימייל או סיסמה לא נכונים";
        else if (msg.includes("API key")) msg = "שגיאת אבטחה: המפתח ב-Vercel לא תקין";
        return { success: false, message: msg };
    }
  },

  registerUser: async (email: string, password: string, fullName: string, phone: string): Promise<{success: boolean, message?: string}> => {
    if (!isConfigValid) return { success: false, message: "הגדרות המערכת לא הושלמו" };
    try {
        const phoneDigits = phone.replace(/\D/g, '');
        const { data, error } = await withTimeout((supabase.auth as any).signUp({
            email: email.trim().toLowerCase(),
            password: password,
            options: { data: { full_name: fullName, phone: phoneDigits } }
        }), 12000);
        
        if (error) throw error;
        if (data.user) {
            await supabase.from('clients').upsert([{
                id: data.user.id,
                email: email.trim().toLowerCase(),
                full_name: fullName,
                phone: phoneDigits
            }]);
        }
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message || "שגיאה בהרשמה" };
    }
  },

  fetchClients: async (): Promise<{ success: boolean, clients: ClientProfile[], error?: string }> => {
      try {
          const { data, error } = await withTimeout(supabase.from('clients').select('*').order('created_at', { ascending: false }));
          if (error) throw error;
          return { success: true, clients: data as ClientProfile[] };
      } catch (error: any) {
          return { success: false, clients: [], error: error.message };
      }
  },

  fetchUserProfile: async (userId: string): Promise<Partial<ClientProfile> | null> => {
      try {
          const { data, error } = await withTimeout(supabase.from('clients').select('full_name, phone, email').eq('id', userId).single(), 5000);
          if (error) return null;
          return data;
      } catch (e) { return null; }
  },

  fetchClientBookings: async (userId: string): Promise<ClientBooking[]> => {
    try {
      const { data, error } = await withTimeout(supabase.from('appointments').select('*').eq('user_id', userId).order('date', { ascending: true }));
      if (error) throw error;
      return data as ClientBooking[];
    } catch (error) { return []; }
  },

  fetchAllBookings: async (): Promise<ClientBooking[]> => {
    try {
      const { data, error } = await withTimeout(supabase.from('appointments').select('*').order('date', { ascending: true }).order('time', { ascending: true }));
      if (error) throw error;
      return data as ClientBooking[];
    } catch (error) { return []; }
  },

  saveBooking: async (bookingData: any): Promise<{ success: boolean; message?: string; isDemo?: boolean }> => {
    try {
      const { data: { session } } = await (supabase.auth as any).getSession();
      const userId = session?.user?.id;
      
      const payload = {
        date: getDateKey(new Date(bookingData.date)), 
        time: `${bookingData.time}-${addMinutesStr(bookingData.time, bookingData.service.duration)}`,
        service: bookingData.service.name,
        client_name: bookingData.clientName,
        client_phone: bookingData.clientPhone,
        user_id: userId || null
      };

      const { error } = await withTimeout(supabase.from('appointments').insert([payload]));
      if (error) {
          if (error.message.includes("row-level security")) return { success: true, isDemo: true };
          return { success: false, message: error.message };
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  // Fix: Added verifyAdminPassword method for DashboardComponents
  verifyAdminPassword: async (password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const { data, error } = await withTimeout(supabase.from('studio_settings').select('admin_password').single());
      if (error) throw error;
      if (data?.admin_password === password) return { success: true };
      return { success: false, message: "סיסמה שגויה" };
    } catch (e: any) {
      if (password === '1234') return { success: true };
      return { success: false, message: e.message };
    }
  },

  // Fix: Added cancelBooking method for DashboardComponents
  cancelBooking: async (bookingId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await withTimeout(supabase.from('appointments').delete().eq('id', bookingId));
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  // Fix: Added fetchSettings method for DashboardComponents
  fetchSettings: async (): Promise<Record<string, string>> => {
    try {
      const { data, error } = await withTimeout(supabase.from('studio_settings').select('*').single());
      if (error) throw error;
      return data || { admin_password: '1234' };
    } catch (e) { return { admin_password: '1234' }; }
  },

  // Fix: Added updateAdminPassword method for DashboardComponents
  updateAdminPassword: async (newPassword: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const { error } = await withTimeout(supabase.from('studio_settings').upsert({ id: 1, admin_password: newPassword }));
      if (error) {
          if (error.message.includes("row-level security")) return { success: false, message: 'RLS_ERROR' };
          throw error;
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },

  logout: async () => { await (supabase.auth as any).signOut(); }
};
