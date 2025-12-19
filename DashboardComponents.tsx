
import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, List, Users, Calendar, Clock, Trash2, Loader2, Lock, Key, Save, Phone, User, RefreshCw, AlertCircle, Check, Settings, Eye, EyeOff, Copy, AlertTriangle, XCircle } from "lucide-react";
import { api } from "./api";
import { ClientBooking, ClientProfile } from "./types";

export function HeroSection({ userEmail, userName, onStartBooking, onManageBookings }: { userEmail?: string, userName?: string, onStartBooking: () => void, onManageBookings: () => void }) {
  const displayName = userName && userName.trim() !== "" ? ` ${userName}` : "";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-fade-in">
        <div className="space-y-2 max-w-xs mx-auto">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-serif-logo">היי{displayName}! 👋</h1>
            <p className="text-slate-500 text-sm tracking-wide">ברוכה הבאה לסטודיו של ליאן שמש</p>
        </div>
        <div className="grid gap-4 w-full max-w-xs">
            <button onClick={onStartBooking} className="group bg-black text-white px-8 py-5 rounded-2xl text-lg font-bold shadow-xl hover:-translate-y-1 transition-all flex items-center justify-between">
                <span>קביעת תור חדש</span>
                <div className="bg-white/20 p-2 rounded-full"><ChevronLeft /></div>
            </button>
            <button onClick={onManageBookings} className="group bg-white text-slate-900 border border-slate-200 px-8 py-5 rounded-2xl text-lg font-bold hover:bg-slate-50 transition-all flex items-center justify-between">
                <span>התורים שלי</span>
                <div className="bg-slate-100 p-2 rounded-full"><List size={20} /></div>
            </button>
        </div>
    </div>
  );
}

export function AdminAuth({ onSuccess, onBack }: { onSuccess: () => void, onBack: () => void }) {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.verifyAdminPassword(password);
            if (res.success) {
                onSuccess();
            } else {
                setError(res.message || "סיסמה שגויה");
            }
        } catch (err) {
            setError("שגיאת תקשורת עם השרת");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-slide-up py-10">
             <div className="flex items-center gap-2 text-right">
                <button onClick={onBack} className="p-2 hover:bg-slate-50 rounded-full transition"><ChevronRight size={24} /></button>
                <h2 className="text-2xl font-bold font-serif-logo">כניסת מנהלת</h2>
            </div>
            <div className="bg-white border border-slate-100 p-8 rounded-3xl text-center space-y-4 shadow-sm">
                <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center mx-auto shadow-lg"><Lock size={28} /></div>
                <p className="text-slate-500 text-xs tracking-wide">אנא הזיני את סיסמת הניהול להמשך</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:ring-1 focus:ring-black text-center text-xl tracking-widest transition" 
                        placeholder="••••" 
                        autoFocus 
                        disabled={loading}
                    />
                    {error && (
                        <div className="bg-red-50 text-red-600 text-[10px] font-bold p-3 rounded-xl border border-red-100 flex items-center justify-center gap-2 animate-shake">
                            <AlertCircle size={14} />
                            <span>{error}</span>
                        </div>
                    )}
                    <button 
                        type="submit" 
                        disabled={loading || !password} 
                        className="w-full bg-black text-white py-4 rounded-full font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'כניסה למערכת'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export function ManageList({ userId, onBack }: { userId: string, onBack: () => void }) {
    const [bookings, setBookings] = useState<ClientBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const load = async () => { 
        setLoading(true); 
        try {
            const data = await api.fetchClientBookings(userId);
            setBookings(Array.isArray(data) ? data : []); 
        } catch (e) {
            console.error("Error loading bookings:", e);
        } finally {
            setLoading(false); 
        }
    }

    useEffect(() => { load(); }, [userId]);

    const handleCancel = async (bookingId: string | number) => { 
        if (deletingId) return; 
        if (!confirm("האם את בטוחה שברצונך לבטל את התור?")) return;
        
        const idStr = String(bookingId);
        setDeletingId(idStr);
        
        try {
            const res = await api.cancelBooking(idStr); 
            if (res.success) {
                setBookings(prev => prev.filter(b => String(b.id) !== idStr));
            } else {
                alert(`לא ניתן היה לבטל את התור: ${res.error || 'שגיאה לא ידועה'}`);
            }
        } catch (e: any) {
            console.error("Cancellation error:", e);
            alert("קרתה שגיאת תקשורת בעת ניסיון הביטול.");
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <div className="space-y-6 animate-slide-up text-right">
             <div className="flex items-center gap-2">
                <button onClick={onBack} className="p-2 hover:bg-slate-50 rounded-full transition"><ChevronRight size={24} /></button>
                <h2 className="text-2xl font-bold font-serif-logo">התורים שלי</h2>
            </div>
            {loading ? <div className="flex justify-center p-20"><Loader2 className="animate-spin text-black" size={32} /></div> : (
                <div className="space-y-4">
                    {bookings.length === 0 ? (
                        <div className="text-center py-24 text-slate-300 bg-slate-50 rounded-3xl border border-dashed border-slate-200 animate-fade-in">
                            <Calendar className="mx-auto mb-2 opacity-20" size={32} />
                            <p className="text-xs font-bold uppercase tracking-widest">אין תורים עתידיים</p>
                        </div>
                    ) : bookings.map((b) => (
                        <div key={String(b.id)} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group hover:border-slate-200 transition-all animate-slide-up">
                            <div className="space-y-1">
                                <div className="font-bold text-slate-900">{b.service}</div>
                                <div className="flex items-center gap-2 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                                    <Calendar size={12} />
                                    <span>{b.date ? new Date(b.date).toLocaleDateString('he-IL') : 'תאריך חסר'}</span>
                                    <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                                    <Clock size={12} />
                                    <span>{b.time}</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleCancel(b.id)} 
                                disabled={!!deletingId}
                                className="flex items-center gap-1.5 text-red-500 hover:text-red-700 font-bold text-[10px] uppercase tracking-widest px-3 py-2 bg-red-50 rounded-full transition-all disabled:opacity-30"
                                title="ביטול מיידי"
                            >
                                {deletingId === String(b.id) ? <Loader2 className="animate-spin" size={14} /> : <XCircle size={14} />}
                                <span>{deletingId === String(b.id) ? 'מבטל...' : 'ביטול תור'}</span>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export function ClientRegistry({ onBack }: { onBack: () => void }) {
    const [activeTab, setActiveTab] = useState<'bookings' | 'clients' | 'settings'>('bookings');
    const [clients, setClients] = useState<ClientProfile[]>([]);
    const [allBookings, setAllBookings] = useState<ClientBooking[]>([]);
    const [studioSettings, setStudioSettings] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [newPassword, setNewPassword] = useState('');
    const [updating, setUpdating] = useState(false);
    const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);
    const [msg, setMsg] = useState<{type:'success'|'error', text:string, isRls?:boolean}|null>(null);
    const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
    const [copied, setCopied] = useState(false);

    const togglePassword = (clientId: string) => {
        setVisiblePasswords(prev => ({ ...prev, [clientId]: !prev[clientId] }));
    };

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [clientsRes, bookingsData, settingsData] = await Promise.all([
                api.fetchClients(),
                api.fetchAllBookings(),
                api.fetchSettings()
            ]);
            if (clientsRes.success) setClients(Array.isArray(clientsRes.clients) ? clientsRes.clients : []);
            setAllBookings(Array.isArray(bookingsData) ? bookingsData : []);
            setStudioSettings(settingsData || {});
        } catch (e) {
            console.error("Load registry data error:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAdminDeleteBooking = async (bookingId: string | number) => {
        if (deletingBookingId) return;
        if (!confirm("האם את בטוחה שברצונך למחוק תור זה לצמיתות?")) return;
        
        const idStr = String(bookingId);
        setDeletingBookingId(idStr);
        
        try {
            const res = await api.cancelBooking(idStr);
            if (res.success) {
                setAllBookings(prev => prev.filter(b => String(b.id) !== idStr));
            } else {
                alert(`מחיקת תור נכשלה: ${res.error || 'שגיאה בשרת'}`);
            }
        } catch (e: any) {
            console.error("Admin delete error:", e);
            alert("שגיאת תקשורת בעת מחיקת התור.");
        } finally {
            setDeletingBookingId(null);
        }
    }

    useEffect(() => { loadData(); }, []);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPassword.trim()) return;
        setUpdating(true);
        setMsg(null);
        try {
            const res = await api.updateAdminPassword(newPassword.trim());
            if (res.success) {
                setMsg({type:'success', text:"סיסמת האדמין עודכנה בהצלחה!"});
                setNewPassword('');
                const settingsData = await api.fetchSettings();
                setStudioSettings(settingsData);
            } else {
                setMsg({type:'error', text:res.message || "שגיאה בעדכון", isRls: res.message === 'RLS_ERROR'});
            }
        } catch (err: any) {
            const isRls = err.message === 'RLS_ERROR' || err.message?.includes("row-level security");
            setMsg({type:'error', text: isRls ? "חסרה הרשאת כתיבה ב-Supabase" : "שגיאת תקשורת בשינוי הסיסמה", isRls});
        } finally {
            setUpdating(false);
        }
    };

    const copySqlFix = () => {
        const sql = `ALTER TABLE public.studio_settings ENABLE ROW LEVEL SECURITY;\nCREATE POLICY "Allow all for studio_settings" ON public.studio_settings FOR ALL USING (true) WITH CHECK (true);`;
        navigator.clipboard.writeText(sql);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6 animate-slide-up pb-10 text-right">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <button onClick={onBack} className="p-2 hover:bg-slate-50 rounded-full transition"><ChevronRight size={24} /></button>
                    <h2 className="text-2xl font-bold font-serif-logo">ממשק ניהול</h2>
                </div>
                <button onClick={loadData} className="p-2 text-slate-400 hover:text-black transition" title="רענון"><RefreshCw size={18} className={isLoading ? "animate-spin" : ""} /></button>
            </div>

            <div className="flex p-1 bg-slate-50 rounded-2xl border border-slate-100">
                {['bookings', 'clients', 'settings'].map((tab) => (
                    <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-black text-white shadow-md' : 'text-slate-400'}`}>
                        {tab === 'bookings' ? 'תורים' : tab === 'clients' ? 'לקוחות' : 'הגדרות'}
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[400px]">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center p-20 gap-3">
                        <Loader2 className="animate-spin text-black" size={32} />
                        <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">טוען...</span>
                    </div>
                ) : activeTab === 'bookings' ? (
                    <div className="divide-y divide-slate-50">
                        {allBookings.length === 0 ? (
                            <div className="p-20 text-center text-slate-300 italic text-xs uppercase tracking-widest">לא נמצאו תורים במערכת</div>
                        ) : allBookings.map((b) => (
                            <div key={String(b.id)} className="p-4 flex justify-between items-center hover:bg-slate-50 transition group">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex flex-col items-center justify-center text-[10px] font-bold leading-tight">
                                        <span>{b.date ? b.date.split('-')[2] : '??'}</span>
                                        <span className="opacity-50 text-[8px]">{b.date ? b.date.split('-')[1] : '??'}</span>
                                    </div>
                                    <div>
                                        <div className="font-bold text-sm text-slate-900">{b.client_name}</div>
                                        <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{b.service} - {b.time}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {b.client_phone && <a href={`tel:${b.client_phone}`} className="p-2 bg-slate-100 text-slate-600 rounded-full hover:bg-black hover:text-white transition shadow-sm"><Phone size={14} /></a>}
                                    <button 
                                        onClick={() => handleAdminDeleteBooking(b.id)} 
                                        disabled={!!deletingBookingId}
                                        className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition shadow-sm disabled:opacity-30"
                                        title="מחיקה מיידית"
                                    >
                                        {deletingBookingId === String(b.id) ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : activeTab === 'clients' ? (
                    <div className="divide-y divide-slate-50">
                        {clients.length === 0 ? (
                            <div className="p-20 text-center text-slate-300 italic text-xs tracking-widest uppercase">אין לקוחות רשומות</div>
                        ) : clients.map(c => (
                            <div key={c.id} className="p-5 flex flex-col gap-3 hover:bg-slate-50 transition">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-bold text-sm leading-none">{c.full_name?.charAt(0)}</div>
                                        <div>
                                            <div className="font-bold text-sm text-slate-900">{c.full_name}</div>
                                            <div className="text-slate-400 text-[10px] font-medium">{c.email}</div>
                                        </div>
                                    </div>
                                    <div className="text-[9px] bg-slate-100 px-2 py-1 rounded-full text-slate-500 font-bold uppercase tracking-wider">{c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A'}</div>
                                </div>
                                <div className="flex items-center justify-between bg-white border border-slate-100 p-3 rounded-2xl shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1.5">
                                            <Phone size={14} className="text-slate-300" />
                                            <span className="text-xs font-mono text-slate-600">{c.phone}</span>
                                        </div>
                                        <div className="w-px h-3 bg-slate-100"></div>
                                        <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => togglePassword(c.id)}>
                                            <Key size={14} className="text-slate-300" />
                                            <span className="text-xs font-mono text-slate-600">
                                                {visiblePasswords[c.id] ? (c.password || 'N/A') : '••••••'}
                                            </span>
                                            <button className="text-slate-300 group-hover:text-black ml-1">
                                                {visiblePasswords[c.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                                            </button>
                                        </div>
                                    </div>
                                    {c.phone && <a href={`tel:${c.phone}`} className="text-blue-500 hover:scale-110 transition"><Phone size={14} /></a>}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-6 space-y-6">
                        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                            <h3 className="text-xs font-bold flex items-center gap-2 text-slate-500 uppercase tracking-widest">
                                <Key size={16} className="text-slate-400" />
                                <span>Security Settings</span>
                            </h3>
                            <div className="space-y-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mr-1">Admin Password:</label>
                                <div className="bg-white border border-slate-100 p-4 rounded-2xl font-mono text-center font-bold text-black shadow-sm text-lg">
                                    {studioSettings.admin_password || '1234'}
                                </div>
                            </div>
                            <form onSubmit={handleUpdatePassword} className="space-y-3 pt-4 border-t border-slate-200">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Change Admin Key:</p>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={newPassword} 
                                        onChange={(e) => setNewPassword(e.target.value)} 
                                        placeholder="New key..." 
                                        className="flex-1 p-3 bg-white border border-slate-100 rounded-xl text-sm focus:ring-1 focus:ring-black outline-none transition shadow-sm" 
                                    />
                                    <button 
                                        type="submit" 
                                        disabled={updating || !newPassword.trim()} 
                                        className="bg-black text-white px-5 rounded-xl font-bold text-sm disabled:opacity-50 hover:bg-slate-800 transition shadow-md flex items-center justify-center"
                                    >
                                        {updating ? <Loader2 size={16} className="animate-spin" /> : <Save size={18} />}
                                    </button>
                                </div>
                                {msg && (
                                    <div className={`text-[11px] p-4 rounded-xl flex flex-col gap-2 animate-slide-up ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                        <div className="flex items-center gap-2">
                                            {msg.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                                            <span className="font-bold">{msg.text}</span>
                                        </div>
                                        {msg.isRls && (
                                            <div className="mt-2 bg-white/50 p-2 rounded-lg text-[10px] text-slate-600 space-y-2 border border-red-100">
                                                <div className="flex items-start gap-1">
                                                    <AlertTriangle size={12} className="shrink-0 mt-0.5 text-orange-500" />
                                                    <p>יש להריץ את קוד התיקון ב-SQL Editor של Supabase.</p>
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onClick={copySqlFix} 
                                                    className="w-full py-2 bg-slate-900 text-white rounded-md font-bold flex items-center justify-center gap-1 hover:bg-black transition"
                                                >
                                                    {copied ? <Check size={12} /> : <Copy size={12} />}
                                                    <span>{copied ? 'הועתק!' : 'העתיקי קוד תיקון'}</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
