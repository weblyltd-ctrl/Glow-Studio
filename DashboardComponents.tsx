import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, List, Users, Calendar, Clock, Trash2, Loader2, Info, Database, EyeOff, Eye, MessageSquare } from "lucide-react";
import { api } from "./api";
import { ClientBooking, ClientProfile } from "./types";
import { BUSINESS_INFO } from "./constants";

export function HeroSection({ userEmail, userName, onStartBooking, onManageBookings }: { userEmail?: string, userName?: string, onStartBooking: () => void, onManageBookings: () => void }) {
  // שימוש בשם המשתמש מהמאגר. אם לא קיים, נציג רק "היי!" נקי.
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
    const load = async () => { setLoading(true); setBookings(await api.fetchClientBookings(userId)); setLoading(false); }
    useEffect(() => { load(); }, [userId]);
    const handleCancel = async (booking: ClientBooking) => { if (confirm('האם לבטל?') && booking.id) { await api.cancelBooking(booking.id); load(); } }
    return (
        <div className="space-y-6 animate-slide-up">
             <div className="flex items-center gap-2"><button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition"><ChevronRight size={24} /></button><h2 className="text-2xl font-bold">התורים שלי</h2></div>
            {loading ? <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div> : bookings.length === 0 ? <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200"><Calendar size={48} className="mx-auto text-slate-300 mb-4" /><p className="text-slate-500 font-medium">עדיין לא קבעת תורים</p></div> : <div className="space-y-4">{bookings.map((b) => <div key={b.id} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-slate-200 transition"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-900 font-bold text-sm border border-slate-100">{b.date.split('-')[2]}</div><div><div className="font-bold text-slate-900">{b.service}</div><div className="text-slate-500 text-sm flex items-center gap-2"><Clock size={12} /><span>{b.time}</span><span className="w-1 h-1 bg-slate-300 rounded-full"></span><span>{b.date}</span></div></div></div><button onClick={() => handleCancel(b)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition-all"><Trash2 size={20} /></button></div>)}</div>}
        </div>
    );
}

export function ClientRegistry({ onBack }: { onBack: () => void }) {
    const [clients, setClients] = useState<ClientProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [showSql, setShowSql] = useState(false);
    const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
    useEffect(() => { const load = async () => { setLoading(true); const res = await api.fetchClients(); if (res.success) setClients(res.clients); setLoading(false); }; load(); }, []);
    return (
        <div className="space-y-6 animate-slide-up">
            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition"><ChevronRight size={24} /></button><h2 className="text-2xl font-bold">מאגר לקוחות</h2></div><button onClick={() => setShowSql(!showSql)} className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full hover:bg-slate-200 transition flex items-center gap-1"><Database size={12} /><span>{showSql ? 'הסתר הגדרות' : 'הגדרת מסד נתונים'}</span></button></div>
            
            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-xs text-blue-800 flex items-start gap-2">
                <Info size={16} className="shrink-0" />
                <div>
                    <span className="font-bold block mb-1">טיפ לפיתוח:</span>
                    ניתן לבטל את חובת אישור המייל ב-Supabase תחת Settings > Authentication ולהוריד את ה-V מ-"Confirm email".
                </div>
            </div>

            {showSql && (
                <div className="bg-slate-900 text-slate-300 p-4 rounded-xl text-left text-xs font-mono relative overflow-hidden">
                    <pre className="whitespace-pre-wrap">create table if not exists public.clients (id uuid references auth.users not null primary key, full_name text, phone text, email text, password text, created_at timestamp with time zone default timezone('utc'::text, now()) not null);</pre>
                    <div className="mt-2 text-slate-500 border-t border-slate-800 pt-2 text-[10px]">יש להריץ פקודה זו ב-SQL Editor ב-Supabase.</div>
                </div>
            )}
            {loading ? <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div> : clients.length === 0 ? <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-slate-200"><Users size={48} className="mx-auto text-slate-300 mb-4" /><p className="text-slate-500 font-medium">אין לקוחות במאגר</p></div> : <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">{clients.map((client, i) => (
                <div key={client.id} className={`p-4 flex items-center justify-between group hover:bg-slate-50 transition ${i !== clients.length - 1 ? 'border-b border-slate-50' : ''}`}><div className="flex items-center gap-3"><div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold">{client.full_name.charAt(0)}</div><div><div className="font-bold text-slate-900">{client.full_name}</div><div className="text-slate-500 text-xs">{client.email}</div></div></div><div className="text-right flex flex-col items-end"><div className="text-slate-900 font-mono text-sm">{client.phone}</div>{client.password && <div className="flex items-center gap-1 mt-1 text-slate-400 text-xs"><button onClick={() => setVisiblePasswords(p => ({...p, [client.id]: !p[client.id]}))}>{visiblePasswords[client.id] ? <EyeOff size={12} /> : <Eye size={12} />}</button><span className="font-mono">{visiblePasswords[client.id] ? client.password : '••••••'}</span></div>}</div></div>
            ))}</div>}
        </div>
    );
}
