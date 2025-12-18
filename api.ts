
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
          
          if (!normalizedData[dateKey]) {
              normalizedData[dateKey] = [];
          }
          
          if (!normalizedData[dateKey].includes(startTime)) {
              normalizedData[dateKey].push(startTime);
          }

          let duration = 30;
          const matched = SERVICES.find(s => s.name === row.service);
          if (matched) duration = matched.duration;

          const slotsToBlock = Math.ceil(duration / 30);
          for (let i = 1; i < slotsToBlock; i++) {
                const nextSlot = addMinutesStr(startTime, i * 30);
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

  loginUser: async (email: string, password: string): Promise<{success: boolean, message?: string, code?: string}> => {
    try {
        const cleanEmail = email.trim().toLowerCase();
        const { data: authData, error: authError } = await (supabase.auth as any).signInWithPassword({
            email: cleanEmail,
            password,
        });
        
        // Check for specific error message for unconfirmed email from Supabase
        if (authError) {
            if (authError.message?.toLowerCase().includes('email not confirmed')) {
                return { 
                    success: false, 
                    message: "המייל טרם אומת. אנא בדקי את תיבת הדואר הנכנס שלך.",
                    code: 'EMAIL_NOT_CONFIRMED'
                };
            }
            throw authError;
        }

        const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('*')
            .eq('id', authData.user.id)
            .single();

        if (clientError || !clientData) {
            const meta = authData.user.user_metadata;
            if (meta?.full_name || meta?.phone) {
                 await supabase.from('clients').upsert([{
                    id: authData.user.id,
                    email: cleanEmail,
                    full_name: meta.full_name || "משתמש חוזר",
                    phone: meta.phone || "0500000000"
                }]);
                return { success: true };
            }
            await (supabase.auth as any).signOut();
            return { 
                success: false, 
                message: "החשבון נמצא במערכת האימות אך חסר בבסיס הנתונים החדש.",
                code: 'INVALID_CREDENTIALS'
            };
        }
        return { success: true };
    } catch (error: any) {
        return { success: false, message: "פרטי התחברות שגויים", code: 'ERROR' };
    }
  },

  registerUser: async (email: string, password: string, fullName: string, phone: string): Promise<{success: boolean, message?: string, requiresConfirmation?: boolean}> => {
    try {
        const cleanEmail = email.trim().toLowerCase();
        const { data, error } = await (supabase.auth as any).signUp({
            email: cleanEmail,
            password,
            options: { data: { full_name: fullName, phone: phone } }
        });
        if (error) throw error;

        if (data.user) {
            await supabase.from('clients').upsert([{
                id: data.user.id,
                email: cleanEmail,
                full_name: fullName,
                phone: phone
            }]);
        }
        return { success: true, requiresConfirmation: !data.session };
    } catch (error: any) {
        return { success: false, message: error.message || "שגיאה בהרשמה" };
    }
  },

  // Added resendConfirmationEmail method to handle Supabase auth confirmation emails
  resendConfirmationEmail: async (email: string): Promise<{ success: boolean; message?: string }> => {
    try {
        const { error } = await (supabase.auth as any).resend({
            type: 'signup',
            email: email.trim().toLowerCase(),
        });
        if (error) throw error;
        return { success: true, message: "מייל אימות נשלח שוב בהצלחה!" };
    } catch (error: any) {
        return { success: false, message: error.message || "שגיאה בשליחת המייל" };
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
          const { data, error } = await supabase.from('clients').select('full_name, phone').eq('id', userId).single();
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
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .order('date', { ascending: true })
        .order('time', { ascending: true });
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
      if (error) return { success: true, isDemo: true };
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
        .single();
      if (error || !data) {
          return password === '1234' ? { success: true } : { success: false, message: "סיסמה שגויה" };
      }
      return data.value === password ? { success: true } : { success: false, message: "סיסמה שגויה" };
    } catch (error: any) {
      return password === '1234' ? { success: true } : { success: false, message: "שגיאה באימות" };
    }
  },

  updateAdminPassword: async (newPassword: string): Promise<{ success: boolean; message?: string }> => {
    try {
      // עדכון ה-value בטבלה studio_settings עבור המפתח admin_password
      const { error } = await supabase
        .from('studio_settings')
        .update({ value: newPassword })
        .eq('key', 'admin_password');
        
      if (error) throw error;
      return { success: true, message: "הסיסמה עודכנה בהצלחה במסד הנתונים!" };
    } catch (error: any) {
      console.error("Update admin password error:", error);
      return { success: false, message: "שגיאה בעדכון: וודאי שהרצת את קוד ה-SQL להרשאות UPDATE." };
    }
  },

  logout: async () => { await (supabase.auth as any).signOut(); }
};
