"use client";

import { useMemo, useState } from "react";

interface DayEntry {
  date: string;
  total: number;
  target: number;
  pct: number;
  hasData: boolean;
}

interface ContributionGraphProps {
  history: DayEntry[];
}

function getLevel(pct: number, hasData: boolean): 0 | 1 | 2 | 3 | 4 {
  if (!hasData) return 0;
  if (pct >= 1) return 4;
  if (pct >= 0.75) return 3;
  if (pct >= 0.5) return 2;
  if (pct > 0) return 1;
  return 0;
}

const LEVEL_COLORS = [
  "bg-white/5 border-white/5",           // 0 - empty
  "bg-blue-900/80 border-blue-700/40",   // 1 - <50%
  "bg-blue-600/70 border-blue-500/50",   // 2 - 50–75%
  "bg-blue-400/80 border-blue-300/50",   // 3 - 75–99%
  "bg-cyan-300 border-cyan-200/60",      // 4 - 100% ✅
];

const LEVEL_LABELS = ["No data", "< 50%", "50–75%", "75–99%", "Goal met ✓"];

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function getWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ContributionGraph({ history }: ContributionGraphProps) {
  const [tooltip, setTooltip] = useState<{ entry: DayEntry; x: number; y: number } | null>(null);

  // Pad history to fill full weeks (start on Sunday)
  const weeks = useMemo(() => {
    // We want 15 weeks of cells (105 days), left-padded with empties so last day is today
    const TOTAL_CELLS = 105; // 15 weeks
    const padded: (DayEntry | null)[] = [];

    // today is last in history; figure out what day-of-week it falls on
    const todayDate = history.length > 0 ? new Date(history[history.length - 1].date + "T00:00:00") : new Date();
    const todayDow = todayDate.getDay(); // 0=Sun … 6=Sat
    // we want the grid to end on a Saturday column
    const trailingEmpties = 6 - todayDow;
    const totalNeeded = TOTAL_CELLS - trailingEmpties;
    const leadingEmpties = Math.max(0, totalNeeded - history.length);

    for (let i = 0; i < leadingEmpties; i++) padded.push(null);
    for (const d of history) padded.push(d);
    for (let i = 0; i < trailingEmpties; i++) padded.push(null);

    // Chunk into weeks (columns of 7)
    const ws: (DayEntry | null)[][] = [];
    for (let i = 0; i < padded.length; i += 7) {
      ws.push(padded.slice(i, i + 7));
    }
    return ws;
  }, [history]);

  // Month labels: find first cell of each month
  const monthLabels = useMemo(() => {
    const labels: { col: number; label: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((week, col) => {
      const first = week.find((d) => d !== null);
      if (!first) return;
      const m = new Date(first.date + "T00:00:00").getMonth();
      if (m !== lastMonth) {
        labels.push({
          col,
          label: new Date(first.date + "T00:00:00").toLocaleDateString([], { month: "short" }),
        });
        lastMonth = m;
      }
    });
    return labels;
  }, [weeks]);

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const SHOW_DAYS = [1, 3, 5]; // Mon, Wed, Fri

  const completedDays = history.filter((d) => d.pct >= 1).length;
  const activeDays = history.filter((d) => d.hasData).length;
  const streak = useMemo(() => {
    let s = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].pct >= 1) s++;
      else break;
    }
    return s;
  }, [history]);

  return (
    <div className="w-full">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { value: completedDays, label: "Goals met" },
          { value: activeDays, label: "Active days" },
          { value: streak, label: "🔥 Streak" },
        ].map(({ value, label }) => (
          <div
            key={label}
            className="bg-white/5 rounded-2xl py-3 flex flex-col items-center border border-white/5"
          >
            <span className="text-white font-bold text-xl tabular-nums">{value}</span>
            <span className="text-blue-400 text-xs mt-0.5">{label}</span>
          </div>
        ))}
      </div>

      {/* Graph */}
      <div className="relative overflow-x-auto pb-1">
        <div className="min-w-[300px]">
          {/* Month labels row */}
          <div className="flex mb-1 pl-7">
            {weeks.map((_, col) => {
              const lbl = monthLabels.find((m) => m.col === col);
              return (
                <div key={col} className="flex-1 min-w-0">
                  {lbl ? (
                    <span className="text-blue-400/70 text-[9px] font-medium block truncate">
                      {lbl.label}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Grid: rows = days of week, cols = weeks */}
          <div className="flex gap-0.5">
            {/* Day labels */}
            <div className="flex flex-col gap-0.5 mr-1">
              {DAYS.map((d, i) => (
                <div key={d} className="h-[11px] flex items-center">
                  {SHOW_DAYS.includes(i) ? (
                    <span className="text-blue-400/60 text-[8px] w-6 text-right pr-1 leading-none">
                      {d}
                    </span>
                  ) : (
                    <span className="w-6" />
                  )}
                </div>
              ))}
            </div>

            {/* Cells */}
            {weeks.map((week, col) => (
              <div key={col} className="flex flex-col gap-0.5 flex-1">
                {week.map((entry, row) => {
                  const level = entry ? getLevel(entry.pct, entry.hasData) : 0;
                  return (
                    <div
                      key={row}
                      className={`relative rounded-[2px] border cursor-pointer transition-all duration-150 hover:scale-125 hover:z-10 ${LEVEL_COLORS[level]}`}
                      style={{ height: 11, minWidth: 11 }}
                      onMouseEnter={(e) => {
                        if (!entry) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({ entry, x: rect.left, y: rect.top });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      onTouchStart={(e) => {
                        if (!entry) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({ entry, x: rect.left, y: rect.top });
                        setTimeout(() => setTooltip(null), 2000);
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-3 justify-end">
        <span className="text-blue-400/60 text-[9px] mr-0.5">Less</span>
        {LEVEL_COLORS.map((cls, i) => (
          <div
            key={i}
            className={`w-2.5 h-2.5 rounded-[2px] border ${cls}`}
            title={LEVEL_LABELS[i]}
          />
        ))}
        <span className="text-blue-400/60 text-[9px] ml-0.5">More</span>
      </div>

      {/* Tooltip — rendered as fixed overlay */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none px-3 py-2 rounded-xl bg-[#0a1628] border border-white/15 shadow-2xl text-xs"
          style={{
            left: Math.min(tooltip.x, typeof window !== "undefined" ? window.innerWidth - 160 : tooltip.x),
            top: tooltip.y - 70,
          }}
        >
          <p className="text-white font-semibold">{formatDateLabel(tooltip.entry.date)}</p>
          <p className="text-blue-300 mt-0.5">
            {tooltip.entry.total > 0
              ? `${tooltip.entry.total} / ${tooltip.entry.target} ml`
              : "No data"}
          </p>
          {tooltip.entry.total > 0 && (
            <p
              className={`font-bold mt-0.5 ${
                tooltip.entry.pct >= 1 ? "text-cyan-300" : "text-blue-400"
              }`}
            >
              {Math.round(tooltip.entry.pct * 100)}%
              {tooltip.entry.pct >= 1 ? " ✓" : ""}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
