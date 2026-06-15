import { DayData, ReminderState } from "@/types";

const STORAGE_KEY = "water-tracker-data";
const REMINDER_KEY = "water-tracker-reminder";
const TARGET_KEY = "water-tracker-target";

export function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

export function getAllData(): Record<string, DayData> {
  if (typeof window === "undefined") return {};
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : {};
}

export function getTodayData(): DayData {
  if (typeof window === "undefined") {
    return { date: getTodayKey(), logs: [], target: 2000 };
  }
  const target = getTarget();
  const allData = getAllData();
  const today = getTodayKey();
  return allData[today] ?? { date: today, logs: [], target };
}

export function saveTodayData(data: DayData): void {
  const allData = getAllData();
  allData[data.date] = data;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
}

export function resetToday(): void {
  const allData = getAllData();
  const today = getTodayKey();
  delete allData[today];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
}

export function getTarget(): number {
  if (typeof window === "undefined") return 2000;
  const val = localStorage.getItem(TARGET_KEY);
  return val ? parseInt(val) : 2000;
}

export function saveTarget(target: number): void {
  localStorage.setItem(TARGET_KEY, String(target));
}

export function getReminderState(): ReminderState {
  if (typeof window === "undefined") return { enabled: false, interval: 60 };
  const raw = localStorage.getItem(REMINDER_KEY);
  return raw ? JSON.parse(raw) : { enabled: false, interval: 60 };
}

export function saveReminderState(state: ReminderState): void {
  localStorage.setItem(REMINDER_KEY, JSON.stringify(state));
}

// Returns last N days as array [{date, total, target, pct}]
export function getHistoryDays(days: number): Array<{
  date: string;
  total: number;
  target: number;
  pct: number;
  hasData: boolean;
}> {
  const allData = getAllData();
  const target = getTarget();
  const result = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const day = allData[key];
    const total = day ? day.logs.reduce((s, l) => s + l.amount, 0) : 0;
    const t = day?.target ?? target;
    result.push({
      date: key,
      total,
      target: t,
      pct: Math.min(total / t, 1),
      hasData: !!day,
    });
  }
  return result;
}
