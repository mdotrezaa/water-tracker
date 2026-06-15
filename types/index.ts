export interface WaterLog {
  id: string;
  amount: number;
  time: string;
}

export interface DayData {
  date: string;
  logs: WaterLog[];
  target: number;
}

export type ReminderInterval = 30 | 60 | 120;

export interface ReminderState {
  enabled: boolean;
  interval: ReminderInterval;
}
