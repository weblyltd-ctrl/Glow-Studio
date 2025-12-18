
import React, { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft, CalendarDays, Loader2, Clock, CheckCircle, AlertTriangle, Copy, Check, MapPin } from "lucide-react";
import { Service, AppointmentState } from "./types";
import { isWorkingDay, getDateKey, generateTimeSlots } from "./utils";
import { api } from "./api";
import { BUSINESS_INFO } from "./constants";

export function ServiceSelection({ services, onSelect, onBack }: { services: Service[], onSelect: (s: Service) => void, onBack: () => void }) {
    return (
        <div className="space-y-6 animate-slide-up">
            <div className="flex items-center gap-2 mb-6">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition"><ChevronRight size={24} /></button>
                <h2 className="text-2xl font-bold">בחרי שירות</h2>
            </div>
            <div className="grid gap-4">
                {services.map(service => (
                    <div key={service.id} onClick={() => onSelect(service)} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition cursor-pointer flex justify-between items-center group">
                        <div>
                            <h3 className="font-bold text-lg text-slate-900">{service.name}</h3>
                            <p className="text-slate-500 text-sm mb-2">{service.description}</p>
                            <div className="flex items-center gap-3 text-sm font-medium"><span className="text-slate-900">₪{service.price}</span><span className="w-1 h-1 bg-slate-300 rounded-full"></span><span className="text-slate-500">{service.duration} דקות</span></div>
                        </div>
                        <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 group-hover:bg-black group-hover:text-white transition-colors"><ChevronLeft size={20} /></div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function DateSelection({ service, selectedDate, selectedTime, onDateSelect, onTimeSelect, onNext, onBack, isValid, isLoading, error }: any) {
    const [slots, setSlots] = useState<{ time: string; available: boolean; waitingCount: number }[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const dates = Array.from({ length: 14 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() + i); return d; }).filter(d => isWorkingDay(d));
    
    useEffect(() => {
        if (selectedDate && service) {
            setLoadingSlots(true);
            api.fetchBookedSlots().then(({ slots: bookedSlots }) => {
                setSlots(generateTimeSlots(selectedDate, service.duration, bookedSlots || {}));
                setLoadingSlots(false);
            });
        }
    }, [selectedDate, service]);

    return (
        <div className="space-y-6 animate-slide-up h-full flex flex-col">
             <div className="flex items-center gap-2">
                <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition"><ChevronRight size={24} /></button>
                <div><h2 className="text-2xl font-bold">מתי נוח לך?</h2><p className="text-slate-500 text-sm">עבור {service?.name}</p></div>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-4 pt-2 px-1 snap-x no-scrollbar">
                {dates.map((date, i) => {
                    const isSelected = selectedDate && getDateKey(selectedDate) === getDateKey(date);
                    return (
                        <button key={i} onClick={() => onDateSelect(date)} className={`flex-shrink-0 w-16 h-20 rounded-2xl flex flex-col items-center justify-center gap-1 border transition-all snap-start ${isSelected ? 'bg-black text-white border-black shadow-lg scale-105' : 'bg-white text-slate-600 border-slate-100 hover:border-slate-300'}`}>
                            <span className="text-xs opacity-80">{date.toLocaleDateString('he-IL', { weekday: 'short' })}</span>
                            <span className="text-xl font-bold">{date.getDate()}</span>
                        </button>
                    )
                })}
            </div>
            <div className="flex-1 overflow-y-auto min-h-[300px]">
                {!selectedDate ? <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2"><CalendarDays size={32} /><p>יש לבחור תאריך</p></div> : loadingSlots ? <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2"><Loader2 className="animate-spin" size={32} /><p>טוען שעות...</p></div> : <div className="grid grid-cols-3 gap-3 content-start">
                        {slots.map((slot, i) => (
                            <button key={i} onClick={() => onTimeSelect(slot.time, !slot.available)} className={`relative py-3 rounded-xl text-sm font-bold border transition-all ${selectedTime === slot.time ? (slot.available ? 'bg-black text-white border-black shadow-md' : 'bg-yellow-100 text-yellow-900 border-yellow-300 shadow-md') : (slot.available ? 'bg-white text-slate-900 border-slate-200 hover:border-slate-900' : 'bg-slate-50 text-slate-400 border-slate-100')}`}>
                                {slot.time}
                                {!slot.available && <span className="absolute -top-2 -left-2 bg-yellow-400 text-yellow-900 text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">המתנה</span>}
                            </button>
                        ))}
                    </div>}
            </div>
            
            {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100 mb-2">{error}</div>}

            <div className="sticky bottom-0 bg-[#fcf9f7]/90 backdrop-blur-sm pt-4 border-t border-slate-200/50">
                <button 
                    disabled={!isValid || isLoading} 
                    onClick={onNext} 
                    className="w-full bg-black text-white py-4 rounded-full font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                    {isLoading ? <Loader2 className="animate-spin" /> : 'אישור תור'}
                </button>
            </div>
        </div>
    );
}

export function Confirmation({ state, onReset }: any) {
  const [showSql, setShowSql] = useState(false);
  const [copied, setCopied] = useState(false);
  const copySql = () => {
      const sql = `create policy "Enable insert for authenticated users" on "public"."appointments" for insert to authenticated with check (true);`;
      navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="text-center py-10 space-y-6 animate-scale-in">
      <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto shadow-sm"><CheckCircle size={48} /></div>
      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold text-slate-900">איזה כיף! התור נקבע.</h2>
        <p className="text-slate-500">נשלח לך אישור ל-WhatsApp ולמייל.</p>
      </div>
      {state.isDemoMode && (
          <div className="mx-4 bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-xl text-right">
              <div className="flex items-start gap-3">
                <AlertTriangle className="shrink-0 mt-0.5" size={20} />
                <div className="flex-1">
                    <p className="font-bold text-sm">מצב הדגמה (שגיאת הרשאות)</p>
                    <p className="text-xs mt-1">הנתונים לא נשמרו בשרת כי חסרה מדיניות (Policy).</p>
                    <button onClick={() => setShowSql(!showSql)} className="text-xs font-bold underline mt-2 hover:text-orange-900">{showSql ? 'הסתר פתרון' : 'איך מתקנים?'}</button>
                </div>
              </div>
              {showSql && (
                  <div className="mt-3 bg-white p-3 rounded-lg border border-orange-200 text-left relative" dir="ltr">
                      <p className="text-[10px] text-slate-500 mb-1 font-sans">Run this in Supabase SQL Editor:</p>
                      <code className="block text-[10px] font-mono bg-slate-50 p-2 rounded text-slate-700 break-all whitespace-pre-wrap">create policy "Enable insert for authenticated users" on "public"."appointments" for insert to authenticated with check (true);</code>
                      <button onClick={copySql} className="absolute top-2 right-2 p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition">{copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}</button>
                  </div>
              )}
          </div>
      )}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mx-4 inline-block text-right w-full max-w-sm">
        <div className="space-y-4">
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">שירות</span><span className="font-bold">{state.service?.name}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">תאריך</span><span className="font-bold">{state.date?.toLocaleDateString('he-IL')}</span></div>
            <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-slate-500">שעה</span><span className="font-bold">{state.time}</span></div>
             <div className="flex justify-between items-center"><span className="text-slate-500">כתובת</span><div className="text-right flex flex-col items-end"><span className="font-bold">{BUSINESS_INFO.address}</span><button onClick={() => window.open(BUSINESS_INFO.mapUrl, '_blank')} className="text-[10px] text-blue-600 font-bold flex items-center gap-0.5 hover:underline mt-0.5"><MapPin size={10} /><span>נווט לשם</span></button></div></div>
        </div>
      </div>
      <button onClick={onReset} className="text-slate-500 hover:text-slate-900 font-medium underline underline-offset-4">חזרה לדף הבית</button>
    </div>
  );
}

export function WaitingListConfirmation({ state, onReset }: any) {
  return (
    <div className="text-center py-10 space-y-6 animate-scale-in">
      <div className="w-24 h-24 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto shadow-sm"><Clock size={48} /></div>
      <div className="space-y-2">
        <h2 className="text-3xl font-extrabold text-slate-900">נרשמת להמתנה</h2>
        <p className="text-slate-500">אנחנו נודיע לך ברגע שיתפנה מקום.</p>
      </div>
      <button onClick={onReset} className="bg-black text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-slate-800 transition-all">מעולה, תודה!</button>
    </div>
  );
}
