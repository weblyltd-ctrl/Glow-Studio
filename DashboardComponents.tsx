
import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, List, Users, Calendar, Clock, Trash2, Loader2, Info, Database, EyeOff, Eye, MessageSquare, ShieldCheck, AlertCircle, Check, Settings, Lock, Key, Save, Phone, User, RefreshCw } from "lucide-react";
import { api } from "./api";
import { ClientBooking, ClientProfile } from "./types";
import { BUSINESS_INFO } from "./constants";

export function HeroSection({ userEmail, userName, onStartBooking, onManageBookings, onAdminAccess }: { userEmail?: string, userName?: string, onStartBooking: () => void, onManageBookings: () => void, onAdminAccess: () => void }) {
  const displayName = userName && userName.trim() !== "" ? ` ${userName}` : "";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-fade-in">
        <div className="space-y-2 max-w-xs mx-auto">
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">היי{displayName}! 👋</h1>
            <p className="text-slate-500">מה נרצה לעשות היום?</p>
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
            <button onClick={onAdminAccess} className="group bg-slate-50 text-slate-400 border border-slate-100 px-8 py-3 rounded-2xl text-sm font-medium hover:bg-slate-100 transition-all flex items-center justify-center gap-2 mt-4">
                <Settings size={16} />
                <span>ניהול הסטודיו (למנהלת בלבד)</span>
            </button>
        </div>
    </div>
  );
}

export function AdminAuth({ onSuccess, onBack }: { onSuccess: () => void, onBack: () => void }) {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const res = await api.verifyAdminPassword(password);
        setLoading(false);
        if (res.success) onSuccess();
        else setError(res.message || "סיסמה שגויה");
    };

    return (
        <div className="space-y-6 animate-slide-up py-10">
             <div className="flex items-center gap-2 text-right">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition"><ChevronRight size={24} /></button>
                <h2 className="text-2xl font-bold">כניסת מנהלת</h2>
            </div>
            <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl text-center space-y-4">
                <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center mx-auto shadow-lg"><Lock size={28} /></div>
                <p className="text-slate-500 text-sm">אנא הזיני את סיסמת הניהול של הסטודיו</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black text-center text-xl tracking-widest transition" placeholder="****" autoFocus />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    {error && <div className="bg-red-50 text-red-700 text-xs p-3 rounded-xl border border-red-100 animate-shake flex items-center justify-center gap-2"><AlertCircle size={14} /><span>{error}</span></div>}
                    <button type="submit" disabled={loading || !password} className="w-full bg-black text-white py-4 rounded-full font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center disabled:opacity-50">
                        {loading ? <Loader2 className="animate-spin" /> : 'כניסה לממשק'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export function ManageList({ userId, onBack }: { userId: string, onBack: () => void }) {
    const [bookings, setBookings] = useState<ClientBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [cancellingId, setCancellingId] = useState<number | string | null>(null);

    const load = async () => { 
        setLoading(true); 
        const data = await api.fetchClientBookings(userId);
        setBookings(data); 
        setLoading(false); 
    }

    useEffect(() => { load(); }, [userId]);

    const handleCancel = async (booking: ClientBooking) => { 
        if (!window.confirm(`לבטל את התור ל-${booking.service}?`)) return;
        setCancellingId(booking.id);
        const res = await api.cancelBooking(booking.id); 
        if (res.success) setBookings(prev => prev.filter(b => Number(b.id) !== Number(booking.id)));
        setCancellingId(null);
    }

    return (
        <div className="space-y-6 animate-slide-up text-right">
             <div className="flex items-center gap-2">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition"><ChevronRight size={24} /></button>
                <h2 className="text-2xl font-bold">התורים שלי</h2>
            </div>
            {loading ? (
                <div className="flex justify-center p-10"><Loader2 className="animate-spin text-slate-300" size={32} /></div>
            ) : bookings.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200"><Calendar size={48} className="mx-auto text-slate-200 mb-4" /><p className="text-slate-400 font-medium">אין תורים עתידיים</p></div>
            ) : (
                <div className="space-y-4">
                    {bookings.map((b) => (
                        <div key={b.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center hover:border-slate-300 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center font-bold text-slate-900 border border-slate-100">{b.date.split('-')[2]}</div>
                                <div><div className="font-bold text-slate-900">{b.service}</div><div className="text-slate-500 text-xs flex items-center gap-1.5 mt-1"><Clock size={12} /><span>{b.time}</span><span className="w-1 h-1 bg-slate-300 rounded-full"></span><span>{b.date.split('-').reverse().join('.')}</span></div></div>
                            </div>
                            <button onClick={() => handleCancel(b)} disabled={cancellingId === b.id} className="text-slate-200 hover:text-red-500 hover:bg-red-50 p-3 rounded-xl transition-all">
                                {cancellingId === b.id ? <Loader2 size={20} className="animate-spin text-red-500" /> : <Trash2 size={20} />}
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
    const [updatingPassword, setUpdatingPassword] = useState(false);
    const [updateMsg, setUpdateMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [clientsRes, bookingsData, settingsData] = await Promise.all([
                api.fetchClients(),
                api.fetchAllBookings(),
                api.fetchSettings()
            ]);
            if (clientsRes.success) setClients(clientsRes.clients);
            setAllBookings(bookingsData);
            setStudioSettings(settingsData);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedPass = newPassword.trim();
        if (!trimmedPass) return;
        
        setUpdatingPassword(true);
        setUpdateMsg(null);
        
        const res = await api.updateAdminPassword(trimmedPass);
        
        setUpdatingPassword(false);
        if (res.success) {
            setUpdateMsg({ type: 'success', text: "הסיסמה עודכנה בהצלחה בשרת!" });
            setNewPassword('');
            const settingsData = await api.fetchSettings();
            setStudioSettings(settingsData);
        } else {
            setUpdateMsg({ type: 'error', text: res.message || "שגיאה בעדכון הסיסמה. וודאי שה-Anon Key תקין ושיש הרשאות UPDATE ב-Supabase." });
        }
    };

    return (
        <div className="space-y-6 animate-slide-up pb-10 text-right">
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2">
                    <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition"><ChevronRight size={24} /></button>
                    <h2 className="text-2xl font-bold text-slate-900">ניהול הסטודיו</h2>
                </div>
                <button onClick={loadData} className="p-2 text-slate-400 hover:text-black hover:bg-slate-100 rounded-xl transition" title="רענן">
                    <RefreshCw size={20} className={isLoading ? "animate-spin" : ""} />
                </button>
            </div>

            <div className="flex p-1 bg-slate-100 rounded-2xl mx-1 shadow-inner">
                {['bookings', 'clients', 'settings'].map((tab) => (
                    <button 
                        key={tab} 
                        onClick={() => setActiveTab(tab as any)} 
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === tab ? 'bg-white text-black shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {tab === 'bookings' && <Calendar size={16} />}
                        {tab === 'clients' && <Users size={16} />}
                        {tab === 'settings' && <Settings size={16} />}
                        <span>{tab === 'bookings' ? 'תורים' : tab === 'clients' ? 'לקוחות' : 'הגדרות'}</span>
                    </button>
                ))}
            </div>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden min-h-[450px]">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center p-20 gap-4 text-slate-300"><Loader2 className="animate-spin" size={32} /><span className="text-sm font-medium">טוען נתונים...</span></div>
                ) : activeTab === 'bookings' ? (
                    <div className="divide-y divide-slate-50">
                        <div className="p-4 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between"><span>תורים במערכת ({allBookings.length})</span><span>מסודר לפי תאריך</span></div>
                        {allBookings.length === 0 ? (<div className="p-20 text-center text-slate-300 italic">לא נמצאו תורים במערכת.</div>) : (
                            allBookings.map((b) => (
                                <div key={b.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-black text-white rounded-2xl flex flex-col items-center justify-center font-bold text-[10px]"><span className="text-lg leading-none">{b.date.split('-')[2]}</span><span className="opacity-70">{b.date.split('-')[1]}</span></div>
                                        <div><div className="font-bold text-slate-900 flex items-center gap-2"><User size={14} className="text-slate-400" /><span>{b.client_name}</span></div><div className="text-slate-500 text-xs mt-1 flex items-center gap-3"><span className="font-medium text-black">{b.service}</span><span className="w-1 h-1 bg-slate-200 rounded-full"></span><span className="flex items-center gap-1"><Clock size={12} /> {b.time}</span></div></div>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                                        {b.client_phone && (<a href={`tel:${b.client_phone}`} className="flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition"><Phone size={12} /><span>{b.client_phone}</span></a>)}
                                        <div className="text-[10px] text-slate-400 bg-slate-100 px-2 py-1 rounded-md font-mono">#{b.id}</div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                ) : activeTab === 'clients' ? (
                    <div className="divide-y divide-slate-50">
                        <div className="p-4 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">לקוחות רשומות ({clients.length})</div>
                        {clients.length === 0 ? (<div className="p-20 text-center text-slate-300 italic">אין לקוחות רשומות.</div>) : (
                            clients.map(c => (
                                <div key={c.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm">{c.full_name?.charAt(0) || '?'}</div>
                                        <div><div className="font-bold text-slate-900 text-sm">{c.full_name}</div><div className="text-slate-400 text-[11px] font-mono">{c.email}</div></div>
                                    </div>
                                    <div className="text-slate-900 font-mono text-xs bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">{c.phone}</div>
                                </div>
                            ))
                        )}
                    </div>
                ) : (
                    <div className="p-6 space-y-8 animate-fade-in">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2"><Key size={20} className="text-slate-400" /><span>אבטחה וסיסמת ניהול</span></h3>
                            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-6">
                                <div className="space-y-2 text-right">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">סיסמת אדמין נוכחית:</label>
                                    <div className="bg-white border border-slate-200 p-3 rounded-xl font-mono text-sm flex justify-between items-center shadow-sm">
                                        <span className="tracking-widest font-bold">{studioSettings.admin_password || 'טוען...'}</span>
                                        <Lock size={14} className="text-slate-300" />
                                    </div>
                                </div>
                                <div className="border-t border-slate-200 pt-6 text-right">
                                    <p className="text-xs text-slate-500 leading-relaxed mb-4">הקלידי סיסמה חדשה ולחצי על עדכון. הפעולה תשנה את הערך ב-Supabase.</p>
                                    <form onSubmit={handleUpdatePassword} className="space-y-3">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex gap-2">
                                                <input 
                                                    type="text" 
                                                    value={newPassword} 
                                                    onChange={(e) => setNewPassword(e.target.value)} 
                                                    placeholder="סיסמה חדשה..." 
                                                    className="flex-1 p-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black text-sm transition" 
                                                />
                                                <button 
                                                    type="submit" 
                                                    disabled={updatingPassword || !newPassword.trim()} 
                                                    className="bg-black text-white px-5 py-3 rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-50 hover:bg-slate-800 transition shadow-sm"
                                                >
                                                    {updatingPassword ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                    <span>עדכון</span>
                                                </button>
                                            </div>
                                        </div>
                                        {updateMsg && (
                                            <div className={`text-xs p-3 rounded-xl flex items-center gap-2 animate-slide-up ${updateMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                                {updateMsg.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />}
                                                <span>{updateMsg.text}</span>
                                            </div>
                                        )}
                                    </form>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                             <div className="flex items-center gap-2 text-slate-400 text-xs font-medium">
                                 <ShieldCheck size={14} />
                                 <span>השינויים נשמרים ישירות במסד הנתונים שלכם</span>
                             </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
