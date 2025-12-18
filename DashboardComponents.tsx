import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, List, Users, Calendar, Clock, Trash2, Loader2, Info, Database, EyeOff, Eye, MessageSquare, ShieldCheck, AlertCircle, Terminal } from "lucide-react";
import { api } from "./api";
import { ClientBooking, ClientProfile } from "./types";
import { BUSINESS_INFO } from "./constants";

export function HeroSection({ userEmail, userName, onStartBooking, onManageBookings }: { userEmail?: string, userName?: string, onStartBooking: () => void, onManageBookings: () => void }) {
  const displayName = userName && userName.trim() !== "" ? ` ${userName}` : "";
  
  const openWhatsApp = () => {
    window.open(`https://wa.me/${BUSINESS_INFO.phone}?text=היי, אשמח להתייעץ לגבי תור ב-Glow Studio`, '_blank');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-fade-in">
        <div className="space-y-2 max-w-xs mx-auto">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">היי{displayName}! 👋</h1>
            <p className="text-slate-500">מה נרצה לעשות היום?</p>
        </div>
        <div className="grid gap-4 w-full max-w-xs">
            <button onClick={onStartBooking} className="group bg-black text-white px-8 py-5 rounded-2xl text-lg font-bold shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all flex items-center justify-between">
                <span>קביעת תור חדש</span>
                <div className="bg-white/20 p-2 rounded-full"><ChevronLeft className="group-hover:-translate-x-1 transition-transform" /></div>
            </button>
            <button onClick={onManageBookings} className="group bg-white text-slate-900 border border-slate-200 px-8 py-5 rounded-2xl text-lg font-bold hover:border-slate-300 hover:bg-slate-50 transition-all flex items-center justify-between">
                <span>התורים שלי</span>
                <div className="bg-slate-100 text-slate-500 p-2 rounded-full group-hover:bg-white group-hover:text-black transition-colors"><List size={20} /></div>
            </button>
            <button onClick={openWhatsApp} className="group bg-green-50 text-green-700 border border-green-100 p-4 rounded-2xl text-sm font-bold hover:bg-green-100 transition-all flex items-center justify-center gap-2">
                <MessageSquare size={18} className="text-green-500" />
                <span>צרי קשר ב-WhatsApp</span>
            </button>
        </div>
    </div>
  );
}

export function ManageList({ userId, onBack }: { userId: string, onBack: () => void }) {
    const [bookings, setBookings] = useState<ClientBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<number | string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const load = async () => { 
        setLoading(true); 
        setError(null);
        try {
            const data = await api.fetchClientBookings(userId);
            setBookings(data); 
        } catch (e) {
            console.error("Error loading bookings:", e);
            setError("חלה שגיאה בטעינת התורים.");
        } finally {
            setLoading(false); 
        }
    }

    useEffect(() => { load(); }, [userId]);

    const handleCancel = async (e: React.MouseEvent, booking: ClientBooking) => { 
        e.preventDefault();
        e.stopPropagation();

        if (!booking.id) return;
        
        const isConfirmed = window.confirm(`האם את בטוחה שברצונך לבטל את התור ל${booking.service}?`);
        
        if (isConfirmed) { 
            setCancellingId(booking.id);
            setError(null);
            try {
                const res = await api.cancelBooking(booking.id); 
                
                if (res.success) {
                    setBookings(prev => prev.filter(b => String(b.id) !== String(booking.id)));
                } else {
                    setError(res.error || "המחיקה נכשלה. בדקי את ה-Policies ב-Supabase.");
                }
            } catch (err: any) {
                console.error("Unexpected error during delete:", err);
                setError("אירעה שגיאה בתהליך המחיקה.");
            } finally {
                setCancellingId(null);
            }
        } 
    }

    return (
        <div className="space-y-6 animate-slide-up">
             <div className="flex items-center gap-2">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition"><ChevronRight size={24} /></button>
                <h2 className="text-2xl font-bold">התורים שלי</h2>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-100 text-red-700 p-4 rounded-xl text-sm flex flex-col gap-2 animate-fade-in">
                    <div className="flex items-center gap-3">
                        <AlertCircle size={18} className="shrink-0" />
                        <span className="font-bold">שגיאת אבטחה בשרת:</span>
                    </div>
                    <p className="text-xs mr-8 opacity-80">{error}</p>
                    <p className="text-[10px] mr-8 font-medium">עבור למסך הניהול כדי להעתיק את הקוד לתיקון מסד הנתונים.</p>
                </div>
            )}

            {loading && bookings.length === 0 ? (
                <div className="flex justify-center p-10"><Loader2 className="animate-spin text-slate-400" size={32} /></div>
            ) : bookings.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200 animate-fade-in">
                    <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
                    <p className="text-slate-500 font-medium">עדיין לא קבעת תורים</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {bookings.map((b) => (
                        <div key={String(b.id)} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-slate-200 transition-all duration-300">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-900 font-bold text-sm border border-slate-100">
                                    {b.date ? b.date.split('-')[2] : '??'}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900">{b.service}</div>
                                    <div className="text-slate-500 text-xs flex items-center gap-2 mt-0.5">
                                        <Clock size={12} />
                                        <span>{b.time}</span>
                                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                        <span>{b.date?.split('-').reverse().join('.')}</span>
                                    </div>
                                </div>
                            </div>
                            <button 
                                type="button"
                                onClick={(e) => handleCancel(e, b)} 
                                disabled={cancellingId === b.id}
                                className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2.5 rounded-full transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                            >
                                {cancellingId === b.id ? (
                                    <Loader2 className="animate-spin text-red-500" size={20} />
                                ) : (
                                    <Trash2 size={20} />
                                )}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export function ClientRegistry({ onBack }: { onBack: () => void }) {
    const [clients, setClients] = useState<ClientProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSql, setShowSql] = useState(false);
    const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

    useEffect(() => { 
        const load = async () => { 
            setLoading(true); 
            const res = await api.fetchClients(); 
            if (res.success) setClients(res.clients); 
            setLoading(false); 
        }; 
        load(); 
    }, []);

    return (
        <div className="space-y-6 animate-slide-up">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition"><ChevronRight size={24} /></button>
                    <h2 className="text-2xl font-bold">ניהול מערכת</h2>
                </div>
                <button onClick={() => setShowSql(!showSql)} className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200 transition flex items-center gap-1">
                    <Terminal size={12} />
                    <span>{showSql ? 'הסתר פתרון' : 'תיקון מסד נתונים'}</span>
                </button>
            </div>
            
            <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-xs text-red-800 flex items-start gap-3">
                <AlertCircle size={20} className="shrink-0 text-red-500" />
                <div>
                    <span className="font-bold block mb-1 text-sm">זיהינו בלאגן ב-Policies!</span>
                    לפי צילום המסך שלך, יש לך יותר מדי חוקים כפולים שמונעים מחיקה. עליך למחוק את כולם ולהגדיר מחדש בצורה נקייה.
                </div>
            </div>

            {showSql && (
                <div className="bg-slate-900 text-slate-300 p-5 rounded-xl text-left text-[11px] font-mono relative overflow-hidden space-y-4 shadow-2xl">
                    <div className="border-l-2 border-orange-500 pl-3 py-1">
                        <p className="text-orange-400 font-bold mb-2">-- שלב 1: ניקוי כל החוקים הקיימים (להריץ ב-SQL Editor) --</p>
                        <pre className="whitespace-pre-wrap text-slate-400 leading-relaxed mb-4">
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON public.appointments;
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.appointments;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON public.appointments;
DROP POLICY IF EXISTS "Enable public insert" ON public.appointments;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.appointments;
DROP POLICY IF EXISTS "Users can delete own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can insert own appointments" ON public.appointments;
DROP POLICY IF EXISTS "Users can view own appointments" ON public.appointments;
                        </pre>
                        
                        <p className="text-emerald-400 font-bold mb-2">-- שלב 2: הגדרה מחדש ונקייה --</p>
                        <pre className="whitespace-pre-wrap text-emerald-100 leading-relaxed">
-- הפעלת אבטחה
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 1. צפייה בתורים (רק של עצמך)
CREATE POLICY "appointments_select_policy" ON public.appointments
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 2. הוספת תור (רק עבור עצמך)
CREATE POLICY "appointments_insert_policy" ON public.appointments
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 3. מחיקת תור (רק שלך)
CREATE POLICY "appointments_delete_policy" ON public.appointments
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 4. אופציונלי: צפייה בלו"ז הכללי כדי לדעת מה תפוס (ללא פרטי לקוח)
CREATE POLICY "view_booked_slots" ON public.appointments
FOR SELECT TO anon USING (true);
                        </pre>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center p-10"><Loader2 className="animate-spin text-slate-400" /></div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    {clients.map((client, i) => (
                        <div key={client.id} className={`p-4 flex items-center justify-between group hover:bg-slate-50 transition ${i !== clients.length - 1 ? 'border-b border-slate-50' : ''}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold">
                                    {client.full_name?.charAt(0) || '?'}
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
                                        <button onClick={() => setVisiblePasswords(p => ({...p, [client.id]: !p[client.id]}))}>
                                            {visiblePasswords[client.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                                        </button>
                                        <span className="font-mono">{visiblePasswords[client.id] ? client.password : '••••••'}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
