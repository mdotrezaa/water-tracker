"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { WaterLog, ReminderInterval, ReminderState } from "@/types";
import {
  getTodayData,
  saveTodayData,
  resetToday,
  getTarget,
  saveTarget,
  getReminderState,
  saveReminderState,
} from "@/lib/storage";
import {
  requestNotificationPermission,
  getNotificationPermission,
  sendWaterReminder,
} from "@/lib/notification";
import ProgressBar from "./ProgressBar";

const QUICK_AMOUNTS = [150, 250, 500];

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(): string {
  return new Date().toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function WaterTracker() {
  const [logs, setLogs] = useState<WaterLog[]>([]);
  const [target, setTarget] = useState<number>(2000);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [isResetting, setIsResetting] = useState(false);
  const [addingAmount, setAddingAmount] = useState<number | null>(null);
  const [reminderState, setReminderState] = useState<ReminderState>({
    enabled: false,
    interval: 60,
  });
  const [notifPermission, setNotifPermission] = useState<string>("default");
  const [editingTarget, setEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const data = getTodayData();
    setLogs(data.logs);
    setTarget(getTarget());
    const rs = getReminderState();
    setReminderState(rs);
    setNotifPermission(getNotificationPermission());

    // Restore reminder if it was enabled
    if (rs.enabled && getNotificationPermission() === "granted") {
      startReminderInterval(rs.interval);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startReminderInterval = useCallback((minutes: ReminderInterval) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(
      () => {
        sendWaterReminder();
      },
      minutes * 60 * 1000
    );
  }, []);

  const total = logs.reduce((sum, l) => sum + l.amount, 0);

  const addWater = async (amount: number) => {
    setAddingAmount(amount);
    await new Promise((r) => setTimeout(r, 150));

    const newLog: WaterLog = {
      id: crypto.randomUUID(),
      amount,
      time: new Date().toISOString(),
    };
    const newLogs = [newLog, ...logs];
    setLogs(newLogs);
    const data = getTodayData();
    saveTodayData({ ...data, logs: newLogs });
    setAddingAmount(null);
    setCustomAmount("");
  };

  const handleReset = () => {
    if (!isResetting) {
      setIsResetting(true);
      return;
    }
    resetToday();
    setLogs([]);
    setIsResetting(false);
  };

  const handleEnableReminder = async () => {
    const perm = await requestNotificationPermission();
    setNotifPermission(perm);
    if (perm === "granted") {
      const newState: ReminderState = {
        enabled: true,
        interval: reminderState.interval,
      };
      setReminderState(newState);
      saveReminderState(newState);
      startReminderInterval(reminderState.interval);
    }
  };

  const handleStopReminder = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const newState: ReminderState = { ...reminderState, enabled: false };
    setReminderState(newState);
    saveReminderState(newState);
  };

  const handleIntervalChange = (interval: ReminderInterval) => {
    const newState: ReminderState = { ...reminderState, interval };
    setReminderState(newState);
    saveReminderState(newState);
    if (newState.enabled) {
      startReminderInterval(interval);
    }
  };

  const handleTargetSave = () => {
    const val = parseInt(tempTarget);
    if (!isNaN(val) && val >= 100 && val <= 10000) {
      setTarget(val);
      saveTarget(val);
    }
    setEditingTarget(false);
  };

  const handleCustomAdd = () => {
    const val = parseInt(customAmount);
    if (!isNaN(val) && val > 0 && val <= 5000) {
      addWater(val);
    }
  };

  const intervalLabels: Record<ReminderInterval, string> = {
    30: "30 min",
    60: "1 hour",
    120: "2 hours",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1f3d] via-[#0a2a5e] to-[#0d3b7a] flex flex-col items-center px-4 py-8 font-sans">
      <div className="w-full max-w-sm flex flex-col gap-5">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-3xl">💧</span>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Water Tracker
            </h1>
          </div>
          <p className="text-blue-300 text-sm">{formatDate()}</p>
        </div>

        {/* Progress Card */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/10 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-blue-200 text-xs font-semibold uppercase tracking-widest">
              Today's Progress
            </h2>
            {!editingTarget ? (
              <button
                onClick={() => {
                  setTempTarget(String(target));
                  setEditingTarget(true);
                }}
                className="text-blue-300 text-xs underline underline-offset-2 hover:text-white transition-colors"
              >
                Goal: {target} ml
              </button>
            ) : (
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={tempTarget}
                  onChange={(e) => setTempTarget(e.target.value)}
                  className="w-20 bg-white/10 text-white text-xs rounded-lg px-2 py-1 border border-white/20 outline-none focus:border-blue-400"
                  placeholder="ml"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleTargetSave();
                    if (e.key === "Escape") setEditingTarget(false);
                  }}
                />
                <button
                  onClick={handleTargetSave}
                  className="text-emerald-400 text-xs font-semibold hover:text-emerald-300 transition-colors"
                >
                  Save
                </button>
              </div>
            )}
          </div>
          <ProgressBar current={total} target={target} />
        </div>

        {/* Quick Add Buttons */}
        <div>
          <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-3">
            Quick Add
          </p>
          <div className="grid grid-cols-3 gap-3">
            {QUICK_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => addWater(amount)}
                disabled={addingAmount !== null}
                className={`relative overflow-hidden bg-white/10 hover:bg-white/20 active:scale-95 border border-white/10 rounded-2xl py-5 flex flex-col items-center gap-1 transition-all duration-150 ${
                  addingAmount === amount ? "scale-95 bg-blue-500/30" : ""
                }`}
              >
                <span className="text-2xl">
                  {amount === 150 ? "🥤" : amount === 250 ? "🧊" : "🍶"}
                </span>
                <span className="text-white font-bold text-base">{amount}</span>
                <span className="text-blue-300 text-xs">ml</span>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Amount */}
        <div className="flex gap-3">
          <input
            type="number"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            placeholder="Custom ml..."
            min={1}
            max={5000}
            className="flex-1 bg-white/10 border border-white/10 rounded-2xl px-4 py-3.5 text-white placeholder-blue-300/50 text-sm outline-none focus:border-blue-400/60 transition-colors"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCustomAdd();
            }}
          />
          <button
            onClick={handleCustomAdd}
            disabled={!customAmount || isNaN(parseInt(customAmount))}
            className="bg-blue-500 hover:bg-blue-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-2xl px-5 transition-all duration-150 active:scale-95"
          >
            Add
          </button>
        </div>

        {/* Log List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest">
              Today's Logs
            </p>
            {logs.length > 0 && (
              <button
                onClick={handleReset}
                onBlur={() => setIsResetting(false)}
                className={`text-xs font-semibold transition-all duration-150 ${
                  isResetting
                    ? "text-red-400 animate-pulse"
                    : "text-blue-400 hover:text-red-400"
                }`}
              >
                {isResetting ? "Tap again to confirm" : "Reset day"}
              </button>
            )}
          </div>

          {logs.length === 0 ? (
            <div className="bg-white/5 rounded-3xl p-8 text-center border border-white/5">
              <div className="text-4xl mb-3">🫙</div>
              <p className="text-blue-200 font-semibold text-sm">
                No water logged yet
              </p>
              <p className="text-blue-400 text-xs mt-1">
                Tap a button above to get started
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {logs.map((log, idx) => (
                <div
                  key={log.id}
                  className="bg-white/8 border border-white/8 rounded-2xl px-5 py-3.5 flex items-center justify-between"
                  style={{
                    animation: idx === 0 ? "slideIn 0.3s ease-out" : undefined,
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-blue-400 text-lg">💧</span>
                    <span className="text-white font-bold text-base">
                      {log.amount}{" "}
                      <span className="text-blue-300 font-normal text-sm">
                        ml
                      </span>
                    </span>
                  </div>
                  <span className="text-blue-400 text-xs">
                    {formatTime(log.time)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reminder Section */}
        <div className="bg-white/8 border border-white/10 rounded-3xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🔔</span>
            <h3 className="text-white font-semibold text-sm">
              Drink Reminders
            </h3>
            {reminderState.enabled && (
              <span className="ml-auto text-emerald-400 text-xs font-semibold bg-emerald-400/10 px-2.5 py-1 rounded-full">
                Active
              </span>
            )}
          </div>

          {notifPermission === "unsupported" ? (
            <p className="text-blue-400 text-xs">
              Notifications not supported in this browser.
            </p>
          ) : notifPermission === "denied" ? (
            <p className="text-red-400 text-xs">
              Notifications blocked. Enable them in browser settings to use
              reminders.
            </p>
          ) : (
            <>
              {/* Interval Picker */}
              <div className="flex gap-2 mb-4">
                {([30, 60, 120] as ReminderInterval[]).map((interval) => (
                  <button
                    key={interval}
                    onClick={() => handleIntervalChange(interval)}
                    className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-all duration-150 ${
                      reminderState.interval === interval
                        ? "bg-blue-500 text-white"
                        : "bg-white/10 text-blue-300 hover:bg-white/15"
                    }`}
                  >
                    {intervalLabels[interval]}
                  </button>
                ))}
              </div>

              {/* Toggle */}
              {reminderState.enabled ? (
                <button
                  onClick={handleStopReminder}
                  className="w-full bg-white/10 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-red-400 font-semibold rounded-2xl py-3.5 text-sm transition-all duration-150 active:scale-95"
                >
                  Stop Reminder
                </button>
              ) : (
                <button
                  onClick={handleEnableReminder}
                  className="w-full bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-2xl py-3.5 text-sm transition-all duration-150 active:scale-95"
                >
                  Enable Reminder
                </button>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-blue-500 text-xs pb-2">
          {total > 0
            ? `You've had ${total} ml today. Keep it up! 💪`
            : "Start your hydration journey 🌊"}
        </p>
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
