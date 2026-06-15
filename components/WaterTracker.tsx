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
  getHistoryDays,
} from "@/lib/storage";
import {
  requestWebNotificationPermission,
  getWebNotificationPermission,
  sendWebNotification,
  isWebNotificationSupported,
  initAudio,
  playChime,
} from "@/lib/notification";
import DonutProgress from "./DonutProgress";
import ContributionGraph from "./ContributionGraph";

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

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
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
  const [webNotifPermission, setWebNotifPermission] = useState<string>("unsupported");
  const [editingTarget, setEditingTarget] = useState(false);
  const [tempTarget, setTempTarget] = useState("");
  const [showBanner, setShowBanner] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [history, setHistory] = useState<ReturnType<typeof getHistoryDays>>([]);
  const [activeTab, setActiveTab] = useState<"today" | "history">("today");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshHistory = useCallback(() => {
    setHistory(getHistoryDays(105));
  }, []);

  useEffect(() => {
    const data = getTodayData();
    setLogs(data.logs);
    setTarget(getTarget());
    const rs = getReminderState();
    setReminderState(rs);
    setWebNotifPermission(getWebNotificationPermission());
    refreshHistory();

    if (rs.enabled) startReminderInterval(rs.interval);
    return () => clearAllTimers();
  }, []);

  const clearAllTimers = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
  };

  const triggerReminder = useCallback(() => {
    setShowBanner(true);
    if (bannerTimeoutRef.current) clearTimeout(bannerTimeoutRef.current);
    bannerTimeoutRef.current = setTimeout(() => setShowBanner(false), 8000);
    playChime();
    sendWebNotification();
  }, []);

  const startCountdown = useCallback((minutes: ReminderInterval) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    let secs = minutes * 60;
    setCountdown(secs);
    countdownRef.current = setInterval(() => {
      secs -= 1;
      setCountdown(secs);
      if (secs <= 0 && countdownRef.current) clearInterval(countdownRef.current);
    }, 1000);
  }, []);

  const startReminderInterval = useCallback(
    (minutes: ReminderInterval) => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      startCountdown(minutes);
      intervalRef.current = setInterval(() => {
        triggerReminder();
        startCountdown(minutes);
      }, minutes * 60 * 1000);
    },
    [triggerReminder, startCountdown]
  );

  const total = logs.reduce((sum, l) => sum + l.amount, 0);

  const addWater = async (amount: number) => {
    initAudio();
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
    refreshHistory();
  };

  const handleReset = () => {
    if (!isResetting) { setIsResetting(true); return; }
    resetToday();
    setLogs([]);
    setIsResetting(false);
    refreshHistory();
  };

  const handleEnableReminder = async () => {
    initAudio();
    const newState: ReminderState = { enabled: true, interval: reminderState.interval };
    setReminderState(newState);
    saveReminderState(newState);
    startReminderInterval(reminderState.interval);
    if (isWebNotificationSupported()) {
      const perm = await requestWebNotificationPermission();
      setWebNotifPermission(perm);
    }
  };

  const handleStopReminder = () => {
    clearAllTimers();
    setShowBanner(false);
    setCountdown(0);
    const newState: ReminderState = { ...reminderState, enabled: false };
    setReminderState(newState);
    saveReminderState(newState);
  };

  const handleIntervalChange = (interval: ReminderInterval) => {
    const newState: ReminderState = { ...reminderState, interval };
    setReminderState(newState);
    saveReminderState(newState);
    if (newState.enabled) startReminderInterval(interval);
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
    if (!isNaN(val) && val > 0 && val <= 5000) addWater(val);
  };

  const intervalLabels: Record<ReminderInterval, string> = {
    30: "30 min",
    60: "1 hr",
    120: "2 hrs",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#060f23] via-[#091529] to-[#060f23] flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-sm flex flex-col gap-5">

        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-white tracking-tight">Water Tracker</h1>
          </div>
          <p className="text-blue-400 text-sm">{formatDate()}</p>
        </div>

        {/* Reminder banner */}
        <div className={`overflow-hidden transition-all duration-500 ease-out ${showBanner ? "max-h-24 opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-400/30 rounded-2xl px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-white font-semibold text-sm">Time to drink water!</p>
                <p className="text-cyan-300 text-xs">Stay hydrated 🚰</p>
              </div>
            </div>
            <button
              onClick={() => { addWater(250); setShowBanner(false); }}
              className="bg-cyan-500 text-white text-xs font-bold rounded-xl px-3 py-2 active:scale-95 transition-transform"
            >
              +250ml
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-white/5 rounded-2xl p-1 border border-white/5">
          {(["today", "history"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold capitalize transition-all duration-200 ${activeTab === tab
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
                  : "text-blue-400 hover:text-white"
                }`}
            >
              {tab === "today" ? "Today" : "History"}
            </button>
          ))}
        </div>

        {/* TODAY TAB */}
        {activeTab === "today" && (
          <>
            {/* Donut Progress Card */}
            <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/8 shadow-2xl flex flex-col items-center gap-2">
              <div className="flex items-center justify-between w-full mb-1">
                <h2 className="text-blue-300 text-xs font-semibold uppercase tracking-widest">
                  Today's Progress
                </h2>
                {!editingTarget ? (
                  <button
                    onClick={() => { setTempTarget(String(target)); setEditingTarget(true); }}
                    className="text-blue-400 text-xs underline underline-offset-2 hover:text-white transition-colors"
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
                    <button onClick={handleTargetSave} className="text-emerald-400 text-xs font-semibold">
                      Save
                    </button>
                  </div>
                )}
              </div>
              <DonutProgress current={total} target={target} />
            </div>

            {/* Quick Add */}
            <div>
              <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest mb-3">
                Quick Add
              </p>
              <div className="grid grid-cols-3 gap-3">
                {QUICK_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    onClick={() => addWater(amount)}
                    disabled={addingAmount !== null}
                    className={`bg-white/6 hover:bg-white/12 active:scale-95 border border-white/8 rounded-2xl py-5 flex flex-col items-center gap-1.5 transition-all duration-150 ${addingAmount === amount ? "scale-95 bg-blue-500/20" : ""
                      }`}
                  >
                    <span className="text-2xl">
                      {amount === 150 ? "🥤" : amount === 250 ? "🧊" : "🍶"}
                    </span>
                    <span className="text-white font-bold text-base">{amount}</span>
                    <span className="text-blue-400 text-xs">ml</span>
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
                className="flex-1 bg-white/6 border border-white/8 rounded-2xl px-4 py-3.5 text-white placeholder-blue-400/40 text-sm outline-none focus:border-blue-500/60 transition-colors"
                onKeyDown={(e) => { if (e.key === "Enter") handleCustomAdd(); }}
              />
              <button
                onClick={handleCustomAdd}
                disabled={!customAmount || isNaN(parseInt(customAmount))}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-semibold rounded-2xl px-5 transition-all duration-150 active:scale-95"
              >
                Add
              </button>
            </div>

            {/* Logs */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-blue-400 text-xs font-semibold uppercase tracking-widest">
                  Today's Logs
                </p>
                {logs.length > 0 && (
                  <button
                    onClick={handleReset}
                    onBlur={() => setIsResetting(false)}
                    className={`text-xs font-semibold transition-all duration-150 ${isResetting ? "text-red-400 animate-pulse" : "text-blue-500 hover:text-red-400"
                      }`}
                  >
                    {isResetting ? "Tap again to confirm" : "Reset day"}
                  </button>
                )}
              </div>

              {logs.length === 0 ? (
                <div className="bg-white/3 rounded-3xl p-8 text-center border border-white/5">
                  <div className="text-4xl mb-3">🫙</div>
                  <p className="text-blue-200 font-semibold text-sm">No water logged yet</p>
                  <p className="text-blue-500 text-xs mt-1">Tap a button above to get started</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {logs.map((log, idx) => (
                    <div
                      key={log.id}
                      className="bg-white/5 border border-white/6 rounded-2xl px-5 py-3.5 flex items-center justify-between"
                      style={{ animation: idx === 0 ? "slideIn 0.3s ease-out" : undefined }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-blue-400 text-lg">💧</span>
                        <span className="text-white font-bold text-base">
                          {log.amount}{" "}
                          <span className="text-blue-400 font-normal text-sm">ml</span>
                        </span>
                      </div>
                      <span className="text-blue-500 text-xs tabular-nums">{formatTime(log.time)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reminder */}
            <div className="bg-white/5 border border-white/8 rounded-3xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">🔔</span>
                <h3 className="text-white font-semibold text-sm">Drink Reminders</h3>
                {reminderState.enabled && (
                  <span className="ml-auto text-emerald-400 text-xs font-semibold bg-emerald-400/10 px-2.5 py-1 rounded-full">
                    Active
                  </span>
                )}
              </div>
              {reminderState.enabled && countdown > 0 && (
                <p className="text-blue-400 text-xs mb-3 pl-7">
                  Next in{" "}
                  <span className="text-cyan-300 font-semibold tabular-nums">
                    {formatCountdown(countdown)}
                  </span>
                </p>
              )}
              <p className="text-blue-500/70 text-xs mb-4">
                In-app banner + chime. Works on all devices.
              </p>
              <div className="flex gap-2 mb-4">
                {([30, 60, 120] as ReminderInterval[]).map((interval) => (
                  <button
                    key={interval}
                    onClick={() => handleIntervalChange(interval)}
                    className={`flex-1 rounded-xl py-2.5 text-xs font-semibold transition-all duration-150 ${reminderState.interval === interval
                        ? "bg-blue-600 text-white"
                        : "bg-white/6 text-blue-400 hover:bg-white/10"
                      }`}
                  >
                    {intervalLabels[interval]}
                  </button>
                ))}
              </div>
              {reminderState.enabled ? (
                <button
                  onClick={handleStopReminder}
                  className="w-full bg-white/6 hover:bg-red-500/15 border border-white/8 hover:border-red-500/30 text-red-400 font-semibold rounded-2xl py-3.5 text-sm transition-all duration-150 active:scale-95"
                >
                  Stop Reminder
                </button>
              ) : (
                <button
                  onClick={handleEnableReminder}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-2xl py-3.5 text-sm transition-all duration-150 active:scale-95"
                >
                  Enable Reminder
                </button>
              )}
            </div>

            <p className="text-center text-blue-600 text-xs pb-2">
              {total > 0
                ? `You've had ${total} ml today. Keep it up! 💪`
                : "Start your hydration journey 🌊"}
            </p>
          </>
        )}

        {/* HISTORY TAB */}
        {activeTab === "history" && (
          <div className="bg-white/5 border border-white/8 rounded-3xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-semibold text-sm">15-Week History</h2>
              <span className="text-blue-500 text-xs">Last 105 days</span>
            </div>
            <ContributionGraph history={history} />
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-shimmer { animation: shimmer 2s infinite; }
      `}</style>
    </div>
  );
}
