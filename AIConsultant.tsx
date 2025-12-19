import React, { useState, useEffect, useRef } from "react";
import { Sparkles, X, Send } from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from "./types";

export function AIConsultant({ onClose }: { onClose: () => void }) {
    const [messages, setMessages] = useState<ChatMessage[]>([{ 
        role: 'model', 
        text: 'היי! אני גלואו בוט, העוזרת החכמה של הסטודיו. איך אני יכולה לעזור לך היום? 😊' 
    }]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => { 
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); 
    }, [messages]);

    const sendMessage = async () => {
        const trimmedInput = input.trim();
        if (!trimmedInput || isThinking) return;
        
        const userMsg = trimmedInput; 
        setInput(''); 
        setMessages(prev => [...prev, { role: 'user', text: String(userMsg) }]); 
        setIsThinking(true);
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
            
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: [{
                    parts: [{
                        text: `את עוזרת חכמה בסטודיו "LS Eyebrow Artist" של ליאן שמש. 
                        השירותים כוללים: עיצוב גבות (100 ש"ח), הרמת גבות (220 ש"ח), הרמת ריסים (250 ש"ח), 
                        עיצוב ריסים (180 ש"ח) וחבילת LS Signature (350 ש"ח). 
                        התשובות שלך צריכות להיות קצרות, מקצועיות וחביבות בעברית.
                        שאלה של לקוחה: ${userMsg}`
                    }]
                }]
            });

            const safeText = response.text || "סליחה, לא הצלחתי לעבד את התשובה.";
            setMessages(prev => [...prev, { role: 'model', text: String(safeText) }]);
        } catch (error) { 
            console.error("AI Error:", error);
            setMessages(prev => [...prev, { role: 'model', text: "משהו בתקשורת שלי השתבש, אולי תנסי שוב? 🙏" }]); 
        } finally { 
            setIsThinking(false); 
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/20 backdrop-blur-sm animate-fade-in" role="dialog" aria-modal="true">
            <div className="bg-white w-full sm:w-[400px] h-[80vh] sm:h-[600px] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
                <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-tr from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                            <Sparkles size={16} />
                        </div>
                        <span className="font-bold">Glow Bot</span>
                    </div>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition" aria-label="סגור צ'אט">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] p-3 rounded-2xl text-sm leading-relaxed ${
                                msg.role === 'user' 
                                ? 'bg-black text-white rounded-br-none shadow-sm' 
                                : 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-bl-none'
                            }`}>
                                {String(msg.text)}
                            </div>
                        </div>
                    ))}
                    {isThinking && (
                        <div className="flex justify-start">
                            <div className="bg-white p-3 rounded-2xl rounded-bl-none shadow-sm flex gap-1 items-center">
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                                <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                
                <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
                    <input 
                        type="text" 
                        value={input} 
                        onChange={e => setInput(e.target.value)} 
                        onKeyDown={e => e.key === 'Enter' && sendMessage()} 
                        placeholder="תשאלי אותי משהו..." 
                        className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black transition" 
                    />
                    <button 
                        onClick={sendMessage} 
                        disabled={!input.trim() || isThinking} 
                        className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center disabled:opacity-30 transition-all hover:bg-slate-800"
                        aria-label="שלח הודעה"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}