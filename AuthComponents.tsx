import React, { useState } from "react";
import { LogIn, UserPlus, ChevronRight, AlertCircle, RefreshCw, Loader2, Check, User, Phone } from "lucide-react";
import { api } from "./api";

export function WelcomeScreen({ onLogin, onRegister }: { onLogin: () => void, onRegister: () => void }) {
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
            </div>
        </div>
    );
}

export function ManageLogin({ onLoginSuccess, onBack }: { onLoginSuccess: () => void, onBack: () => void }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [error, setError] = useState<{message: string, code?: string} | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMsg(null);
        const res = await api.loginUser(email, password);
        setLoading(false);
        if (res.success) {
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
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">סיסמה</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition" />
                </div>

                {error && (
                    <div className={`p-4 rounded-xl text-sm flex flex-col gap-2 ${error.code === 'EMAIL_NOT_CONFIRMED' ? 'bg-orange-50 text-orange-800 border border-orange-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                        <div className="flex items-start gap-2">
                             <AlertCircle size={18} className="shrink-0 mt-0.5" />
                             <span>{error.message}</span>
                        </div>
                        {error.code === 'EMAIL_NOT_CONFIRMED' && (
                            <button type="button" onClick={handleResend} disabled={resending} className="text-xs font-bold underline text-right hover:text-orange-900 transition flex items-center gap-1">
                                {resending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                                <span>שלחי לי שוב מייל אימות</span>
                            </button>
                        )}
                    </div>
                )}

                {successMsg && (
                    <div className="bg-green-50 text-green-800 border border-green-200 p-4 rounded-xl text-sm flex items-center gap-2">
                        <Check size={18} />
                        <span>{successMsg}</span>
                    </div>
                )}

                <button type="submit" disabled={loading} className="w-full bg-black text-white py-4 rounded-full font-bold disabled:opacity-50 shadow-lg hover:shadow-xl transition-all flex items-center justify-center">
                    {loading ? <Loader2 className="animate-spin" /> : 'כניסה'}
                </button>
            </form>
        </div>
    );
}

export function Register({ onRegisterSuccess, onBack }: { onRegisterSuccess: () => void, onBack: () => void }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        const res = await api.registerUser(email, password, fullName, phone);
        setLoading(false);
        if (res.success) {
            if (res.requiresConfirmation) {
                alert("הרשמה בוצעה בהצלחה! נשלח אליך מייל לאימות החשבון. יש לאשר אותו לפני הכניסה.");
                onBack();
            } else {
                onRegisterSuccess();
            }
        } else {
            setError(res.message || "שגיאה בהרשמה");
        }
    };

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
                        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} required className="w-full p-4 pr-12 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition" placeholder="ישראל ישראלי" />
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">טלפון</label>
                    <div className="relative">
                        <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required className="w-full p-4 pr-12 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition" placeholder="050-1234567" />
                    </div>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">אימייל</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition" placeholder="example@mail.com" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">סיסמה</label>
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black transition" placeholder="******" />
                    <p className="text-xs text-slate-400 mt-1">מינימום 6 תווים</p>
                </div>
                {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-xl border border-red-100">{error}</div>}
                <button type="submit" disabled={loading} className="w-full bg-black text-white py-4 rounded-full font-bold disabled:opacity-50 shadow-lg hover:shadow-xl transition-all flex items-center justify-center">
                    {loading ? <Loader2 className="animate-spin" /> : 'סיום הרשמה'}
                </button>
            </form>
        </div>
    );
}
