import { WORKING_DAYS, BUSINESS_HOURS } from "./constants";

export const getDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatTime = (date: Date) => {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

export const addMinutesStr = (timeStr: string, minutesToAdd: number): string => {
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  
  const d = new Date();
  d.setHours(parseInt(parts[0], 10), parseInt(parts[1], 10), 0, 0);
  d.setMinutes(d.getMinutes() + minutesToAdd);
  
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

export const isWorkingDay = (date: Date) => WORKING_DAYS.includes(date.getDay());

export const getWaitCount = (t: string) => {
  const sum = t.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return (sum % 4) + 1;
};

export const generateTimeSlots = (
  date: Date, 
  durationMinutes: number, 
  bookedSlotsMap: Record<string, string[]>
): { time: string; available: boolean; waitingCount: number }[] => {
  const slots: { time: string; available: boolean; waitingCount: number }[] = [];
  const startHour = BUSINESS_HOURS.start;
  const endHour = BUSINESS_HOURS.end;
  let current = new Date(date);
  current.setHours(startHour, 0, 0, 0);
  const endTime = new Date(date);
  endTime.setHours(endHour, 0, 0, 0);
  const dateKey = getDateKey(date);
  const bookedTimes = new Set(bookedSlotsMap[dateKey] || []);

  while (current < endTime) {
    const serviceEnd = new Date(current.getTime() + durationMinutes * 60000);
    if (serviceEnd <= endTime) {
      const timeString = formatTime(current);
      let isBlocked = false;
      const slotsNeeded = Math.ceil(durationMinutes / 30);
      for (let i = 0; i < slotsNeeded; i++) {
          const slotToCheck = addMinutesStr(timeString, i * 30);
          if (bookedTimes.has(slotToCheck)) {
              isBlocked = true;
              break;
          }
      }
      const waitingCount = isBlocked ? getWaitCount(timeString) : 0;
      slots.push({ time: timeString, available: !isBlocked, waitingCount });
    }
    current = new Date(current.getTime() + 30 * 60000); 
  }
  return slots;
};
