
import React, { useState, useEffect } from "react";
import { LogIn, UserPlus, ChevronRight, AlertCircle, RefreshCw, Loader2, Check, User, Phone, Eye, EyeOff, CheckCircle2, Mail, Settings } from "lucide-react";
import { api } from "./api";

export function WelcomeScreen({ onLogin, onRegister, onAdminAccess }: { onLogin: () => void, onRegister: () => void, onAdminAccess: () => void }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-8 animate-fade-in px-4">
             <div className="relative">
                <div className="absolute inset-0 bg-pink-200 blur-3xl opacity-30 rounded-full"></div>
                <div className="w-20 h-20 bg-black text-white rounded-full flex items-center justify-center text-3xl font-bold relative z-10 shadow-xl mb-4">G</div>
            </div>
            <div className="space-y-2">
                <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Glow Studio</h1>
                <p className="text-slate-500 text-lg">ברוכה הבאה לאפליקציית הריסים והגבות שלך</p>
            </div>
            <div className="w-full max-w-xs space-y-4 pt-8">
                <button onClick={onLogin} className="w-full bg-black text-white py-4 rounded-full font-bold shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
                    <LogIn size={20} />
                    <span>כניסה לחשבון קיים</span>
                </button>
                <button onClick={onRegister} className="w-full bg-white text-slate-900 border border-slate-200 py-4 rounded-full font-bold hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                    <UserPlus size={20} />
                    <span>הרשמה לחשבון חדש</span>
                </button>
                
                <div className="pt-10">
                    <button 
                        onClick={onAdminAccess} 
                        className="text-slate-400 hover:text-slate-600 transition-colors text-sm flex items-center gap-2 mx-auto py-2 px-4 rounded-xl border border-transparent hover:border-slate-100"
                    >
                        <Settings size={14} />
                        <span>כניסת מנהלת</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export function ManageLogin({ onLoginSuccess, onBack, onGoToRegister }: { onLoginSuccess: () => void, onBack: () => void, onGoToRegister: () => void }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState<{message: string, code?: string} | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // טעינת מידע שמור בטעינת הרכיב
    useEffect(() => {
        const savedEmail = localStorage.getItem('rememberedEmail');
        const savedRememberMe = localStorage.getItem('rememberMeState') === 'true';
        
        if (savedRememberMe) {
            setRememberMe(true);
            if (savedEmail) {
                // שימוש ב-Timeout קצר כדי למנוע דריסה על ידי ה-autofill של הדפדפן
                const timer = setTimeout(() => {
                    setEmail(savedEmail);
                }, 100);
                return () => clearTimeout(timer);
            }
        }
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMsg(null);
        
        const cleanEmail = email.trim();
        const res = await api.loginUser(cleanEmail, password);
        
        setLoading(false);
        if (res.success) {
            // שמירת הגדרות "זכור אותי"
            localStorage.setItem('rememberMeState', rememberMe.toString());
            if (rememberMe) {
                localStorage.setItem('rememberedEmail', cleanEmail);
            } else {
                localStorage.removeItem('rememberedEmail');
            }
            onLoginSuccess();
        } else {
            setError({ message: res.message || "שגיאה בכניסה", code: res.code });
        }
    };

    const handleResend = async () => {
        setResending(true);
        const res = await api.resendConfirmationEmail(email);
        setResending(false);
        if (res.success) {
            setSuccessMsg(res.message || "מייל נשלח!");
            setError(null);
        } else {
            setError({ message: res.message || "שגיאה בשליחה" });
        }
    };

    return (
        <div className="space-y-6 animate-slide-up">
             <div className="flex items-center gap-2">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition"><ChevronRight size={24} /></button>
                <h2 className="text-2xl font-bold">כניסה</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">אימייל</label>
                    <input 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                        className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition" 
                        placeholder="example@mail.com" 
                        autoComplete="email"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">סיסמה</label>
                    <div className="relative">
                        <input 
                            type={showPassword ? "text" : "password"} 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                            className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition" 
                            placeholder="******" 
                            autoComplete="current-password"
                        />
                        <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <input 
                            type="checkbox" 
                            id="rememberMe" 
                            checked={rememberMe} 
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 accent-black rounded cursor-pointer"
                        />
                        <label htmlFor="rememberMe" className="text-sm text-slate-600 cursor-pointer select-none">זכור אותי</label>
                    </div>
                    <button type="button" className="text-sm text-slate-400 hover:text-slate-600 transition">שכחתי סיסמה</button>
                </div>

                {error && (
                    <div className={`p-4 rounded-xl text-sm flex flex-col gap-2 ${error.code === 'EMAIL_NOT_CONFIRMED' ? 'bg-orange-50 text-orange-800 border border-orange-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                        <div className="flex items-start gap-2">
                             <AlertCircle size={18} className="shrink-0 mt-0.5" />
                             <div className="flex-1">
                                <span className="font-bold block mb-1">אירעה שגיאה</span>
                                <p className="whitespace-pre-wrap leading-relaxed">{error.message}</p>
                             </div>
                        </div>
                        {error.code === 'EMAIL_NOT_CONFIRMED' && (
                            <button type="button" onClick={handleResend} disabled={resending} className="text-xs font-bold underline text-right hover:text-orange-900 transition flex items-center gap-1 self-end mt-2">
                                {resending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                <span>שלחי לי שוב מייל אימות</span>
                            </button>
                        )}
                    </div>
                )}

                {successMsg && (
                    <div className="bg-green-50 text-green-800 border border-green-200 p-4 rounded-xl text-sm flex items-center gap-2 animate-fade-in">
                        <Check size={18} />
                        <span>{successMsg}</span>
                    </div>
                )}

                <button type="submit" disabled={loading} className="w-full bg-black text-white py-4 rounded-full font-bold disabled:opacity-50 shadow-lg hover:shadow-xl transition-all flex items-center justify-center">
                    {loading ? <Loader2 className="animate-spin" /> : 'כניסה'}
                </button>

                <div className="text-center pt-2">
                    <button type="button" onClick={onGoToRegister} className="text-sm text-slate-500 hover:text-black transition">
                        עדיין אין לך חשבון? <span className="font-bold underline">להרשמה מהירה</span>
                    </button>
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
    const [showSuccess, setShowSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const phoneDigits = phone.replace(/\D/g, '');
        if (phoneDigits.length !== 10) {
            setError("מספר טלפון חייב להכיל בדיוק 10 ספרות.");
            return;
        }

        setLoading(true);
        setError(null);
        const cleanEmail = email.trim();
        const res = await api.registerUser(cleanEmail, password, fullName, phoneDigits);
        setLoading(false);
        
        if (res.success) {
            setShowSuccess(true);
        } else {
            if (res.message?.includes("security purposes")) {
                const seconds = res.message.match(/\d+/);
                setError(`מסיבות אבטחה, יש להמתין ${seconds ? seconds[0] : 'כמה'} שניות לפני ניסיון הרשמה נוסף.`);
            } else {
                setError(res.message || "שגיאה בהרשמה");
            }
        }
    };

    if (showSuccess) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-6 animate-scale-in">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center shadow-inner">
                    <CheckCircle2 size={40} />
                </div>
                <div className="space-y-2">
                    <h2 className="text-3xl font-bold text-slate-900">הרשמה בוצעה בהצלחה!</h2>
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center gap-3 text-blue-800">
                        <Mail className="shrink-0" size={24} />
                        <p className="font-bold text-lg leading-tight">יש לאשר הרשמה דרך המייל</p>
                    </div>
                    <p className="text-slate-500 text-sm max-w-[280px] mx-auto mt-4">
                        שלחנו לך קישור לאימות לכתובת <strong>{email}</strong>. לאחר האישור תוכלי להיכנס ולקבוע תור.
                    </p>
                </div>
                <button 
                    onClick={onGoToLogin} 
                    className="bg-black text-white px-10 py-4 rounded-full font-bold shadow-lg hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                    <LogIn size={18} />
                    <span>מעבר להתחברות</span>
                </button>
            </div>
        );
    }

     return (
        <div className="space-y-6 animate-slide-up">
             <div className="flex items-center gap-2">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition"><ChevronRight size={24} /></button>
                <h2 className="text-2xl font-bold">הרשמה</h2>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">שם מלא</label>
                    <div className="relative">
                        <User className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="w-full p-4 pr-12 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition" placeholder="ישראל ישראלי" autoComplete="name" />
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">טלפון</label>
                    <div className="relative">
                        <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className="w-full p-4 pr-12 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition" placeholder="0501234567" maxLength={10} autoComplete="tel" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 px-1">נא להזין 10 ספרות בדיוק (לדוגמה: 0501234567)</p>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">אימייל</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition" placeholder="example@mail.com" autoComplete="email" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">סיסמה</label>
                    <div className="relative">
                        <input 
                            type={showPassword ? "text" : "password"} 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                            minLength={6} 
                            className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition" 
                            placeholder="******" 
                            autoComplete="new-password"
                        />
                        <button 
                            type="button" 
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">מינימום 6 תווים</p>
                </div>
                {error && (
                    <div className="text-red-700 text-sm bg-red-50 p-4 rounded-xl border border-red-200 flex items-start gap-2 animate-shake">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" />
                        <span className="whitespace-pre-wrap">{error}</span>
                    </div>
                )}
                <button type="submit" disabled={loading} className="w-full bg-black text-white py-4 rounded-full font-bold disabled:opacity-50 shadow-lg hover:shadow-xl transition-all flex items-center justify-center">
                    {loading ? <Loader2 className="animate-spin" /> : 'סיום הרשמה'}
                </button>

                <div className="text-center pt-2">
                    <button type="button" onClick={onGoToLogin} className="text-sm text-slate-500 hover:text-black transition">
                        כבר יש לך חשבון? <span className="font-bold underline">להתחברות</span>
                    </button>
                </div>
            </form>
        </div>
    );
}
