
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, SERVICES } from "./constants";
import { ClientBooking, ClientProfile } from "./types";
import { getDateKey, addMinutesStr } from "./utils";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const api = {
  fetchBookedSlots: async (): Promise<{ connected: boolean; slots: Record<string, string[]>; error?: string }> => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('date, time, service');
        
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
    try {
        let authParams: any = { password };
        
        // Check if identity is email or phone
        if (identity.includes('@')) {
            authParams.email = identity.trim().toLowerCase();
        } else {
            const phoneDigits = identity.replace(/\D/g, '');
            authParams.phone = `+972${phoneDigits.startsWith('0') ? phoneDigits.slice(1) : phoneDigits}`;
        }
        
        const { data: authData, error: authError } = await (supabase.auth as any).signInWithPassword(authParams);
        
        if (authError) throw authError;

        // Sync to clients table
        await supabase.from('clients').upsert([{
            id: authData.user.id,
            email: authData.user.email,
            full_name: authData.user.user_metadata?.full_name || "לקוחה",
            phone: authData.user.user_metadata?.phone || ""
        }]);

        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message || "פרטי התחברות שגויים", code: 'ERROR' };
    }
  },

  registerUser: async (email: string, password: string, fullName: string, phone: string): Promise<{success: boolean, message?: string}> => {
    try {
        const phoneDigits = phone.replace(/\D/g, '');
        
        const { data, error } = await (supabase.auth as any).signUp({
            email: email.trim().toLowerCase(),
            password: password,
            options: { 
                data: { 
                    full_name: fullName, 
                    phone: phoneDigits 
                }
            }
        });
        
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
          const { data, error } = await supabase.from('clients').select('*').order('created_at', { ascending: false });
          if (error) throw error;
          return { success: true, clients: data as ClientProfile[] };
      } catch (error: any) {
          return { success: false, clients: [], error: error.message };
      }
  },

  fetchUserProfile: async (userId: string): Promise<Partial<ClientProfile> | null> => {
      try {
          const { data, error } = await supabase.from('clients').select('full_name, phone, email').eq('id', userId).single();
          if (error) return null;
          return data;
      } catch (e) { return null; }
  },

  fetchClientBookings: async (userId: string): Promise<ClientBooking[]> => {
    try {
      const { data, error } = await supabase.from('appointments').select('*').eq('user_id', userId).order('date', { ascending: true });
      if (error) throw error;
      return data as ClientBooking[];
    } catch (error) { return []; }
  },

  fetchAllBookings: async (): Promise<ClientBooking[]> => {
    try {
      const { data, error } = await supabase.from('appointments').select('*').order('date', { ascending: true }).order('time', { ascending: true });
      if (error) throw error;
      return data as ClientBooking[];
    } catch (error) { return []; }
  },

  fetchSettings: async (): Promise<Record<string, string>> => {
    try {
      const { data, error } = await supabase.from('studio_settings').select('key, value');
      if (error) throw error;
      const settings: Record<string, string> = {};
      data.forEach(item => settings[item.key] = item.value);
      return settings;
    } catch (error) { return {}; }
  },

  saveBooking: async (bookingData: any): Promise<{ success: boolean; message?: string; isDemo?: boolean }> => {
    try {
      const { data: { user } } = await (supabase.auth as any).getUser();
      if (!user) return { success: false, message: "יש להתחבר." };

      const payload = {
        date: getDateKey(new Date(bookingData.date)), 
        time: `${bookingData.time}-${addMinutesStr(bookingData.time, bookingData.service.duration)}`,
        service: bookingData.service.name,
        client_name: bookingData.clientName,
        client_phone: bookingData.clientPhone,
        user_id: user.id 
      };

      const { error } = await supabase.from('appointments').insert([payload]);
      if (error) {
          if (error.message.includes("row-level security")) return { success: true, isDemo: true };
          return { success: false, message: error.message };
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  cancelBooking: async (bookingId: number | string): Promise<{ success: boolean; error?: any }> => {
    try {
      const { data: { user } } = await (supabase.auth as any).getUser();
      if (!user) throw new Error("יש להתחבר.");
      const { error } = await supabase.from('appointments').delete().eq('id', Number(bookingId)).eq('user_id', user.id); 
      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  verifyAdminPassword: async (password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const { data, error } = await supabase
        .from('studio_settings')
        .select('value')
        .eq('key', 'admin_password')
        .maybeSingle();
        
      if (error) throw error;
      if (!data) return password === '1234' ? { success: true } : { success: false, message: "סיסמה שגויה (1234)" };
      
      return data.value === password ? { success: true } : { success: false, message: "סיסמה שגויה" };
    } catch (error: any) {
      return { success: false, message: "שגיאת תקשורת" };
    }
  },

  updateAdminPassword: async (newPassword: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const { error } = await supabase
        .from('studio_settings')
        .upsert({ key: 'admin_password', value: newPassword }, { onConflict: 'key' });
        
      if (error) {
          if (error.message.includes("row-level security")) {
              throw new Error("RLS_ERROR");
          }
          throw error;
      }
      return { success: true, message: "עודכן!" };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  },

  logout: async () => { await (supabase.auth as any).signOut(); }
};
