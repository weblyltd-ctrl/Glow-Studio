
import React, { useState, useEffect } from "react";
import { ChevronRight, ChevronLeft, CalendarDays, Loader2, Clock, CheckCircle, AlertTriangle, Copy, Check, MapPin, ChevronDown, ChevronUp } from "lucide-react";
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

function Calendar({ selectedDate, onDateSelect }: { selectedDate: Date | null, onDateSelect: (d: Date) => void }) {
    const [viewDate, setViewDate] = useState(new Date(selectedDate || new Date()));
    
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1));
    const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

    const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
    const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

    const today = new Date();
    today.setHours(0,0,0,0);

    const weekDays = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

    return (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 animate-fade-in">
            <div className="flex items-center justify-between mb-4 px-2">
                <button onClick={prevMonth} className="p-2 hover:bg-slate-50 rounded-full transition"><ChevronRight size={18} /></button>
                <h3 className="font-bold text-slate-900 font-serif-logo text-lg">
                    {viewDate.toLocaleString('he-IL', { month: 'long', year: 'numeric' })}
                </h3>
                <button onClick={nextMonth} className="p-2 hover:bg-slate-50 rounded-full transition"><ChevronLeft size={18} /></button>
            </div>
            
            <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map(d => (
                    <div key={d} className="text-center text-[10px] font-bold text-slate-300 uppercase py-2">{d}</div>
                ))}
            </div>
            
            <div className="grid grid-cols-7 gap-1">
                {blanks.map(i => <div key={`blank-${i}`} />)}
                {days.map(date => {
                    const isSelected = selectedDate && getDateKey(selectedDate) === getDateKey(date);
                    const isPast = date < today;
                    const isWorkDay = isWorkingDay(date);
                    const isDisabled = isPast || !isWorkDay;
                    
                    return (
                        <button
                            key={date.toISOString()}
                            disabled={isDisabled}
                            onClick={() => onDateSelect(date)}
                            className={`
                                aspect-square rounded-xl flex items-center justify-center text-sm font-medium transition-all relative
                                ${isSelected ? 'bg-black text-white shadow-md scale-105 z-10' : ''}
                                ${!isSelected && !isDisabled ? 'hover:bg-slate-50 text-slate-700' : ''}
                                ${isDisabled ? 'text-slate-200 cursor-not-allowed' : ''}
                                ${!isSelected && !isDisabled && getDateKey(date) === getDateKey(today) ? 'text-blue-600 font-bold' : ''}
                            `}
                        >
                            {date.getDate()}
                            {isSelected && <div className="absolute -bottom-1 w-1 h-1 bg-white rounded-full"></div>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export function DateSelection({ service, selectedDate, selectedTime, onDateSelect, onTimeSelect, onNext, onBack, isValid, isLoading, error }: any) {
    const [slots, setSlots] = useState<{ time: string; available: boolean; waitingCount: number }[]>([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    
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
                <div>
                    <h2 className="text-2xl font-bold">מתי נוח לך?</h2>
                    <p className="text-slate-500 text-sm">בחרי יום ושעה עבור {service?.name}</p>
                </div>
            </div>

            <Calendar selectedDate={selectedDate} onDateSelect={onDateSelect} />

            <div className="flex-1 overflow-y-auto min-h-[250px] pt-4">
                {!selectedDate ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-3 py-10">
                        <CalendarDays size={40} className="opacity-20" />
                        <p className="text-xs font-bold uppercase tracking-widest">יש לבחור תאריך בלוח השנה</p>
                    </div>
                ) : loadingSlots ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2 py-10">
                        <Loader2 className="animate-spin" size={32} />
                        <p className="text-xs font-bold uppercase tracking-widest">בודקת זמינות...</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-3 content-start animate-fade-in pb-10">
                        {slots.map((slot, i) => {
                            const isSelected = selectedTime === slot.time;
                            const isAvailable = slot.available;
                            
                            return (
                                <button 
                                    key={i} 
                                    onClick={() => onTimeSelect(slot.time, !isAvailable)} 
                                    className={`
                                        relative py-4 rounded-2xl border transition-all flex flex-col items-center justify-center gap-0.5
                                        ${isSelected 
                                            ? (isAvailable ? 'bg-black text-white border-black shadow-lg scale-105 z-10' : 'bg-amber-400 text-black border-amber-500 shadow-md scale-105 z-10 font-bold') 
                                            : (isAvailable ? 'bg-white text-slate-900 border-slate-100 hover:border-slate-300 shadow-sm' : 'bg-[#fffbeb] text-amber-900 border-amber-100 font-medium')
                                        }
                                    `}
                                >
                                    <span className={`transition-all ${!isAvailable ? 'text-[12px]' : 'text-sm font-bold'}`}>
                                        {slot.time}
                                    </span>
                                    {!isAvailable && (
                                        <span className={`
                                            text-[8px] font-bold uppercase tracking-tight
                                            ${isSelected ? 'text-amber-900' : 'text-amber-600 opacity-70'}
                                        `}>
                                            המתנה
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
            
            {error && (
                <div className="text-red-500 text-[11px] font-bold bg-red-50 p-4 rounded-2xl border border-red-100 mb-4 animate-shake flex items-center gap-2">
                    <AlertTriangle size={14} />
                    <span>{error}</span>
                </div>
            )}

            <div className="sticky bottom-0 bg-[#fcf9f7]/90 backdrop-blur-md pt-4 pb-4 border-t border-slate-100">
                <button 
                    disabled={!isValid || isLoading} 
                    onClick={onNext} 
                    className="w-full bg-black text-white py-4 rounded-full font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-2 transform active:scale-95"
                >
                    {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'אישור תור'}
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
