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
          const sName = row.service;
          const matched = SERVICES.find(s => s.name === sName);
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

  loginUser: async (email: string, password: string): Promise<{success: boolean, message?: string, code?: 'EMAIL_NOT_CONFIRMED' | 'INVALID_CREDENTIALS' | 'ERROR'}> => {
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;
        return { success: true };
    } catch (error: any) {
        console.error("Login failed:", error.message);
        const errLower = error.message.toLowerCase();
        
        if (errLower.includes("invalid login credentials")) {
            return { 
                success: false, 
                message: "אימייל או סיסמה שגויים. בדקי שוב את הפרטים.", 
                code: 'INVALID_CREDENTIALS' 
            };
        } else if (errLower.includes("email not confirmed")) {
            return { 
                success: false, 
                message: "כתובת האימייל טרם אושרה. יש לאשר את המייל בקישור שנשלח אלייך.", 
                code: 'EMAIL_NOT_CONFIRMED' 
            };
        }
        
        return { success: false, message: error.message || "שגיאה בכניסה", code: 'ERROR' };
    }
  },

  resendConfirmationEmail: async (email: string): Promise<{success: boolean, message?: string}> => {
      try {
          const { error } = await supabase.auth.resend({
              type: 'signup',
              email,
              options: {
                  emailRedirectTo: window.location.origin
              }
          });
          if (error) throw error;
          return { success: true, message: "מייל אימות נשלח שוב בהצלחה! בדקי את תיבת הדואר הנכנס." };
      } catch (error: any) {
          console.error("Resend error:", error);
          return { success: false, message: "אירעה שגיאה בשליחת המייל. נסי שוב מאוחר יותר." };
      }
  },

  registerUser: async (email: string, password: string, fullName: string, phone: string): Promise<{success: boolean, message?: string, requiresConfirmation?: boolean}> => {
    try {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: window.location.origin,
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

        if (data.user) {
            try {
                await supabase.from('clients').insert([{
                    id: data.user.id,
                    email: email,
                    full_name: fullName,
                    phone: phone,
                    password: password
                }]);
            } catch (tableError) {
                console.warn("Could not save to clients table (Registry).", tableError);
            }
        }
        
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

  fetchUserProfile: async (userId: string): Promise<Partial<ClientProfile> | null> => {
      try {
          const { data, error } = await supabase
            .from('clients')
            .select('full_name, phone')
            .eq('id', userId)
            .single();
            
          if (error) return null;
          return data;
      } catch (e) {
          return null;
      }
  },

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

  saveBooking: async (bookingData: any): Promise<{ success: boolean; message?: string; isDemo?: boolean }> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const startTime = bookingData.time;
      const duration = bookingData.service?.duration || 30;
      const endTime = addMinutesStr(startTime, duration);
      const timeRange = `${startTime}-${endTime}`;

      const payload: any = {
        date: getDateKey(new Date(bookingData.date)), 
        time: timeRange,
        service: bookingData.service.name,
        client_name: bookingData.clientName,
        client_phone: bookingData.clientPhone,
        client_email: bookingData.clientEmail,
      };

      if (user) payload.user_id = user.id;

      const { error } = await supabase.from('appointments').insert([payload]);
      
      if (error) {
          if (error.code === '42501' || error.message.toLowerCase().includes('policy')) {
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

  cancelBooking: async (bookingId: number | string): Promise<{ success: boolean; error?: any }> => {
    try {
      // וידוא שהמזהה נשלח כראוי
      const { error } = await supabase
        .from('appointments')
        .delete()
        .match({ id: bookingId });

      if (error) throw error;
      return { success: true };
    } catch (error: any) {
      console.error("API Error - cancelBooking:", error);
      return { success: false, error };
    }
  },

  logout: async () => {
      await supabase.auth.signOut();
  }
};