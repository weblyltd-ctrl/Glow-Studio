import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, SERVICES } from "./constants";
import { ClientBooking, ClientProfile } from "./types";
import { getDateKey, addMinutesStr } from "./utils";

const withTimeout = (promise: any, ms: number = 7000): Promise<any> => {
  return Promise.race([
    promise,
    new Promise<any>((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), ms)
    ),
  ]);
};

export const checkConfigStatus = () => {
  return {
    hasUrl: typeof SUPABASE_URL === 'string' && SUPABASE_URL.startsWith('http'),
    hasKey: typeof SUPABASE_ANON_KEY === 'string' && SUPABASE_ANON_KEY.length > 20,
    url: SUPABASE_URL || 'missing',
    keyStatus: SUPABASE_ANON_KEY ? 'present' : 'missing'
  };
};

const safeUrl = (typeof SUPABASE_URL === 'string' && SUPABASE_URL.length > 5) ? SUPABASE_URL : "https://placeholder.supabase.co";
const safeKey = (typeof SUPABASE_ANON_KEY === 'string' && SUPABASE_ANON_KEY.length > 5) ? SUPABASE_ANON_KEY : "missing";

export const supabase = createClient(safeUrl, safeKey);

export const api = {
  fetchBookedSlots: async (): Promise<{ connected: boolean; slots: Record<string, string[]>; error?: string }> => {
    const config = checkConfigStatus();
    if (!config.hasUrl || !config.hasKey) return { connected: false, slots: {}, error: "Config Missing" };
    try {
      const { data, error } = await withTimeout(supabase.from('appointments').select('date, time, service'));
      if (error) throw error;
      const normalizedData: Record<string, string[]> = {};
      data?.forEach((row: any) => {
        const dateKey = row.date;
        const timeRange = row.time;
        const startTime = timeRange.includes('-') ? timeRange.split('-')[0] : timeRange;
        if (!normalizedData[dateKey]) normalizedData[dateKey] = [];
        normalizedData[dateKey].push(startTime);
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

  loginUser: async (identity: string, password: string): Promise<{ success: boolean, message?: string }> => {
    try {
      let authParams: any = { password };
      if (identity.includes('@')) {
        authParams.email = identity.trim().toLowerCase();
      } else {
        const phoneDigits = identity.replace(/\D/g, '');
        authParams.phone = `+972${phoneDigits.startsWith('0') ? phoneDigits.slice(1) : phoneDigits}`;
      }

      const { data: authData, error: authError } = await withTimeout(supabase.auth.signInWithPassword(authParams), 8000);
      if (authError) throw authError;

      return { success: true };
    } catch (error: any) {
      if (error.message === "TIMEOUT") return { success: false, message: "השרת לא עונה. וודאי שהמפתחות ב-Vercel תקינים." };
      let msg = error.message;
      if (msg === "Invalid login credentials") msg = "אימייל או סיסמה לא נכונים";
      return { success: false, message: msg };
    }
  },

  registerUser: async (email: string, password: string, fullName: string, phone: string): Promise<{ success: boolean, message?: string }> => {
    try {
      const phoneDigits = phone.replace(/\D/g, '');
      const { data, error } = await withTimeout(supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: { data: { full_name: fullName, phone: phoneDigits } }
      }), 10000);
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
      const { data, error } = await withTimeout(supabase.from('clients').select('full_name, phone, email').eq('id', userId).single(), 4000);
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
      const { data: { session } } = await supabase.auth.getSession();
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

  verifyAdminPassword: async (password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      // Fetch the row where key is 'admin_password'
      const { data, error } = await withTimeout(supabase.from('studio_settings').select('value').eq('key', 'admin_password').single());

      // If error or no data, fall back to default behavior or error
      if (error) throw error;

      const storedPassword = data?.value;
      if (storedPassword === password) return { success: true };
      return { success: false, message: "סיסמה שגויה" };
    } catch (e: any) {
      if (password === '1234') return { success: true }; // Fallback
      return { success: false, message: e.message };
    }
  },

  cancelBooking: async (bookingId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error } = await withTimeout(supabase.from('appointments').delete().eq('id', bookingId));
      if (error) throw error;
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  },

  fetchSettings: async (): Promise<Record<string, string>> => {
    try {
      const { data, error } = await withTimeout(supabase.from('studio_settings').select('*'));
      if (error) throw error;

      // Convert Array<{key, value}> to Record<key, value>
      const settings: Record<string, string> = {};
      if (Array.isArray(data)) {
        data.forEach(row => {
          if (row.key && row.value) {
            settings[row.key] = row.value;
          }
        });
      }

      // Ensure defaults if missing
      if (!settings.admin_password) settings.admin_password = '1234';
      return settings;
    } catch (e) { return { admin_password: '1234' }; }
  },

  updateAdminPassword: async (newPassword: string): Promise<{ success: boolean; message?: string }> => {
    try {
      // Upsert based on key 'admin_password'
      const { error } = await withTimeout(supabase.from('studio_settings').upsert({ key: 'admin_password', value: newPassword }, { onConflict: 'key' }));
      if (error) {
        if (error.message.includes("row-level security")) return { success: false, message: 'RLS_ERROR' };
        throw error;
      }
      return { success: true };
    } catch (e: any) {
      return { success: false, message: e.message };
    }
  },

  logout: async () => { await supabase.auth.signOut(); }
};