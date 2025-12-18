
// Fix: User type is not exported from @supabase/supabase-js in this version, using any
export type SupabaseUser = any;

export type Service = {
  id: string;
  name: string;
  price: number;
  duration: number; // in minutes
  description: string;
  category: "brows" | "lashes" | "combo";
};

export type AppointmentState = {
  step: "welcome" | "login" | "register" | "home" | "services" | "date" | "confirmation" | "waiting-list-confirmed" | "manage-list" | "client-registry" | "admin-auth";
  service: Service | null;
  date: Date | null;
  time: string | null;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  isWaitingList: boolean;
  isDemoMode?: boolean;
  currentUser: SupabaseUser | null;
};

export type ClientBooking = {
  id: number | string;
  date: string;
  time: string;
  service: string;
  client_name: string;
  client_phone?: string;
  client_email?: string;
};

export type ClientProfile = {
    id: string;
    full_name: string;
    phone: string;
    email: string;
    password?: string;
    created_at: string;
};

export type ChatMessage = {
  role: "user" | "model";
  text: string;
};
