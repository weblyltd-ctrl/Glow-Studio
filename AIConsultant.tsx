import React, { useState, useEffect, useRef } from "react";
import { Sparkles, X, Send } from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import { ChatMessage } from "./types";

export function AIConsultant({ onClose }: { onClose: () => void }) {
    const [messages, setMessages] = useState<ChatMessage[]>([{ role: 'model', text: 'היי! אני גלואו בוט, העוזרת החכמה של הסטודיו. איך אני יכולה לעזור? 😊' }]);
    const [input, setInput] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

    const sendMessage = async () => {
        if (!input.trim()) return;
        const userMsg = input; setInput(''); setMessages(prev => [...prev, { role: 'user', text: userMsg }]); setIsThinking(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: "gemini-2.5-flash",
                contents: [{ role: 'user', parts: [{ text: `Glow Studio assistant. Hebrew, short, helpful. User: ${userMsg}` }] }]
            });
            setMessages(prev => [...prev, { role: 'model', text: response.text || "סליחה, נסי שוב." }]);
        } catch (error) { setMessages(prev => [...prev, { role: 'model', text: "בעיה קטנה, נסי שוב." }]); } finally { setIsThinking(false); }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full sm:w-[400px] h-[80vh] sm:h-[600px] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
                <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-tr from-purple-400 to-pink-400 rounded-full flex items-center justify-center"><Sparkles size={16} /></div>
                        <span className="font-bold">Glow Bot</span>
                    </div>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-black text-white rounded-br-none' : 'bg-white text-slate-800 shadow-sm border border-slate-100 rounded-bl-none'}`}>
                                {msg.text}
                            </div>
                        </div>
                    ))}
                    {isThinking && (
                        <div className="flex justify-start">
                            <div className="bg-white p-3 rounded-2xl rounded-bl-none shadow-sm flex gap-1">
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <div className="p-3 bg-white border-t border-slate-100 flex gap-2">
                    <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="תשאלי אותי משהו..." className="flex-1 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-sm focus:outline-none" />
                    <button onClick={sendMessage} disabled={!input.trim() || isThinking} className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center">
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    )
}
