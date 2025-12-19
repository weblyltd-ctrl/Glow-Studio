
import React, { useState, useEffect, useRef } from "react";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from "./types";

export function AIConsultant({ onClose }: { onClose: () => void }) {
    const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'model', text: 'היי! אני גלואו בוט, העוזרת החכמה של הסטודיו. איך אני יכולה לעזור? 😊' }]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const aiRef = useRef<GoogleGenAI | null>(null);

    useEffect(() => { 
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
    }, [messages]);

    const getAI = () => {
        if (!aiRef.current) {
            aiRef.current = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });
        }
        return aiRef.current;
    };

    const sendMessage = async () => {
        if (!input.trim() || isThinking) return;
        const userMsg = input; 
        setInput(''); 
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]); 
        setIsThinking(true);

        try {
            const ai = getAI();
            const response = await ai.models.generateContent({
                model: "gemini-3-flash-preview",
                contents: `Glow Studio assistant. Hebrew, short, helpful. You are an expert lash and brow artist assistant named Glow Bot. User message: ${userMsg}`,
                config: {
                    temperature: 0.7,
                    maxOutputTokens: 200
                }
            });
            setMessages(prev => [...prev, { role: 'model', text: response.text || "סליחה, אירעה שגיאה. נסי שוב." }]);
        } catch (error) { 
            console.error("AI Error:", error);
            setMessages(prev => [...prev, { role: 'model', text: "משהו השתבש בחיבור שלי. אולי שווה לנסות שוב בעוד רגע." }]); 
        } finally { 
            setIsThinking(false); 
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full sm:w-[420px] h-[85vh] sm:h-[600px] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
                <div className="bg-slate-900 text-white p-5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-tr from-rose-200 to-amber-200 rounded-full flex items-center justify-center text-slate-900"><Sparkles size={18} /></div>
                        <div>
                            <span className="font-bold block text-sm leading-none">Glow Bot</span>
                            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Lashes & Brows Expert</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#fcf9f7]">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                            <div className={`max-w-[85%] p-4 rounded-2xl text-sm leading-relaxed ${
                                msg.role === 'user' 
                                ? 'bg-black text-white rounded-br-none shadow-md' 
                                : 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-bl-none'
                            }`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isThinking && (
                        <div className="flex justify-start animate-fade-in">
                            <div className="bg-white p-4 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce delay-150"></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <div className="p-4 bg-white border-t border-slate-100 flex gap-2 shrink-0">
                    <input 
                        type="text" 
                        value={input} 
                        onChange={e => setInput(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && sendMessage()} 
                        placeholder="תשאלי אותי משהו..." 
                        className="flex-1 bg-slate-50 border border-slate-100 rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-black transition-all" 
                    />
                    <button 
                        onClick={sendMessage} 
                        disabled={!input.trim() || isThinking} 
                        className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 disabled:opacity-30 transition-all"
                    >
                        {isThinking ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                    </button>
                </div>
            </div>
        </div>
    )
}
