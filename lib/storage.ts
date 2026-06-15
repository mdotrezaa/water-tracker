import { DayData, ReminderState, ReminderInterval } from "@/types";

const STORAGE_KEY = "water-tracker-data";
const REMINDER_KEY = "water-tracker-reminder";
const TARGET_KEY = "water-tracker-target";

export function getTodayKey(): string {
  return new Date().toISOString().split("T")[0];
}

export function getTodayData(): DayData {
  if (typeof window === "undefined") {
    return { date: getTodayKey(), logs: [], target: 2000 };
  }

  const target = getTarget();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { date: getTodayKey(), logs: [], target };

  const allData: Record<string, DayData> = JSON.parse(raw);
  const today = getTodayKey();
  return allData[today] ?? { date: today, logs: [], target };
}

export function saveTodayData(data: DayData): void {
  const raw = localStorage.getItem(STORAGE_KEY);
  const allData: Record<string, DayData> = raw ? JSON.parse(raw) : {};
  allData[data.date] = data;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
}

export function resetToday(): void {
  const raw = localStorage.getItem(STORAGE_KEY);
  const allData: Record<string, DayData> = raw ? JSON.parse(raw) : {};
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
