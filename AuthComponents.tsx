
import React, { useState, useEffect } from "react";
import { LogIn, UserPlus, ChevronRight, AlertCircle, Loader2, User, Phone, Eye, EyeOff, Settings, Mail, CheckCircle } from "lucide-react";
import { api } from "./api";

export function WelcomeScreen({ onLogin, onRegister, onAdminAccess }: { onLogin: () => void, onRegister: () => void, onAdminAccess: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4 animate-fade-in relative">
            <div className="mb-12 space-y-0">
                <div className="flex justify-center mb-[-25px] opacity-80">
                   <svg width="180" height="60" viewBox="0 0 120 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 30C37 12 83 12 108 30" stroke="black" strokeWidth="0.6" strokeLinecap="round"/>
                   </svg>
                </div>
                <h1 className="logo-ls text-9xl font-medium text-black leading-none">LS</h1>
                <div className="tracking-[0.3em] text-sm font-medium text-black mt-2">EYEBROW ARTIST</div>
                <div className="text-[10px] text-slate-400 italic pt-3">BY ~ Lian.shemesh</div>
            </div>
            <div className="w-full max-w-xs space-y-3">
                <button onClick={onLogin} className="w-full bg-black text-white py-4 rounded-full font-bold shadow-xl flex items-center justify-center gap-2 transform active:scale-95 transition-all">
                    <LogIn size={18} />
                    <span>כניסה למערכת</span>
                </button>
                <button onClick={onRegister} className="w-full bg-white text-black border border-slate-200 py-4 rounded-full font-bold flex items-center justify-center gap-2 transform active:scale-95 transition-all">
                    <UserPlus size={18} />
                    <span>הרשמה מהירה</span>
                </button>
                <div className="pt-10">
                    <button onClick={onAdminAccess} className="text-slate-300 hover:text-black transition-colors text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 mx-auto py-2">
                        <Settings size={12} />
                        <span>Admin Access</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export function ManageLogin({ onLoginSuccess, onBack, onGoToRegister }: { onLoginSuccess: () => void, onBack: () => void, onGoToRegister: () => void }) {
    const [identity, setIdentity] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        setError(null);
        
        // טיימאאוט הגנה מקומי לממשק
        const timeout = setTimeout(() => {
            if (loading) {
                setLoading(false);
                setError("ההתחברות לוקחת זמן רב מהרגיל. וודאי שיש קליטה.");
            }
        }, 12000);

        try {
            const res = await api.loginUser(identity, password);
            clearTimeout(timeout);
            if (res.success) {
                onLoginSuccess();
            } else {
                setError(res.message || "פרטים לא נכונים");
                setLoading(false);
            }
        } catch (err: any) {
            clearTimeout(timeout);
            setError(err.message || "שגיאת תקשורת");
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-slide-up max-w-sm mx-auto">
             <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 hover:bg-slate-50 rounded-full transition"><ChevronRight size={24} /></button>
                <h2 className="text-3xl font-bold font-serif-logo">כניסה</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
                 <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mr-1">אימייל או טלפון</label>
                    <div className="relative">
                        <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input type="text" value={identity} onChange={(e) => setIdentity(e.target.value)} required className="w-full p-4 pr-12 bg-white border border-slate-100 rounded-2xl focus:ring-1 focus:ring-black outline-none transition shadow-sm" placeholder="אימייל או נייד" />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mr-1">סיסמה</label>
                    <div className="relative">
                        <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-4 bg-white border border-slate-100 rounded-2xl focus:ring-1 focus:ring-black outline-none transition shadow-sm" placeholder="******" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                    </div>
                </div>
                {error && (
                    <div className="p-4 rounded-2xl text-xs bg-red-50 text-red-800 border border-red-100 flex items-start gap-2 animate-shake">
                         <AlertCircle size={16} className="shrink-0 mt-0.5" />
                         <span>{error}</span>
                    </div>
                )}
                <button type="submit" disabled={loading} className="w-full bg-black text-white py-4 rounded-full font-bold disabled:opacity-50 shadow-lg flex items-center justify-center transform active:scale-95 transition-all">
                    {loading ? <Loader2 className="animate-spin" /> : 'התחברות'}
                </button>
                <div className="text-center pt-4">
                    <button type="button" onClick={onGoToRegister} className="text-sm text-slate-400">עדיין אין לך חשבון? <span className="font-bold text-black border-b border-black/20 pb-0.5">להרשמה מהירה</span></button>
                </div>
            </form>
        </div>
    );
}

export function Register({ onRegisterSuccess, onBack, onGoToLogin }: { onRegisterSuccess: () => void, onBack: () => void, onGoToLogin: () => void }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isRegistered, setIsRegistered] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        setError(null);
        try {
            const res = await api.registerUser(email, password, fullName, phone);
            if (res.success) {
                setIsRegistered(true);
            } else {
                setError(res.message || "שגיאה בהרשמה");
                setLoading(false);
            }
        } catch (err: any) {
            setError("שגיאת תקשורת");
            setLoading(false);
        }
    };

    if (isRegistered) {
        return (
            <div className="space-y-8 animate-scale-in text-center py-10 max-w-sm mx-auto">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle size={40} />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-green-700">תודה על הרשמתך!</h2>
                    <p className="text-slate-500 text-sm">החשבון נוצר בהצלחה. כעת ניתן להתחבר.</p>
                </div>
                <button onClick={onGoToLogin} className="w-full bg-black text-white py-4 rounded-full font-bold shadow-xl transform active:scale-95 transition-all">התחברי כעת</button>
            </div>
        );
    }

     return (
        <div className="space-y-8 animate-slide-up max-w-sm mx-auto">
             <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 hover:bg-slate-50 rounded-full transition"><ChevronRight size={24} /></button>
                <h2 className="text-3xl font-bold font-serif-logo">הרשמה</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mr-1">שם מלא</label>
                    <div className="relative">
                        <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="w-full p-4 pr-12 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-1 focus:ring-black transition shadow-sm" placeholder="שם מלא" />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mr-1">אימייל</label>
                    <div className="relative">
                        <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-4 pr-12 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-1 focus:ring-black transition shadow-sm" placeholder="your@email.com" />
                    </div>
                </div>
                 <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mr-1">טלפון</label>
                    <div className="relative">
                        <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className="w-full p-4 pr-12 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-1 focus:ring-black transition shadow-sm" placeholder="050-1234567" maxLength={10} />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mr-1">סיסמה</label>
                    <div className="relative">
                        <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full p-4 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-1 focus:ring-black transition shadow-sm" placeholder="לפחות 6 תווים" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button>
                    </div>
                </div>
                {error && <div className="text-red-700 text-xs bg-red-50 p-4 rounded-2xl border border-red-100 animate-shake flex items-center gap-2"><AlertCircle size={16} />{error}</div>}
                <button type="submit" disabled={loading} className="w-full bg-black text-white py-4 rounded-full font-bold disabled:opacity-50 shadow-lg flex items-center justify-center transform active:scale-95 transition-all">
                    {loading ? <Loader2 className="animate-spin" /> : 'סיום והרשמה'}
                </button>
            </form>
        </div>
    );
}
