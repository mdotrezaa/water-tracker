"use client";

interface DonutProgressProps {
  current: number;
  target: number;
}

export default function DonutProgress({ current, target }: DonutProgressProps) {
  const pct = Math.min(current / target, 1);
  const isGoalMet = current >= target;

  // SVG donut params
  const size = 220;
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 18;
  const r = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * r;
  const dash = pct * circumference;
  const gap = circumference - dash;

  // Gradient id must be unique per instance
  const gradId = "donut-grad";
  const bgGradId = "donut-bg-grad";

  const displayPct = Math.round(pct * 100);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: "rotate(-90deg)" }}
        >
          <defs>
            <linearGradient id={bgGradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.03)" />
            </linearGradient>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              {isGoalMet ? (
                <>
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </>
              ) : pct > 0.5 ? (
                <>
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#818cf8" />
                </>
              ) : (
                <>
                  <stop offset="0%" stopColor="#60a5fa" />
                  <stop offset="100%" stopColor="#38bdf8" />
                </>
              )}
            </linearGradient>
          </defs>

          {/* Background track */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={`url(#${bgGradId})`}
            strokeWidth={strokeWidth}
          />

          {/* Progress arc */}
          {pct > 0 && (
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${gap}`}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.8s cubic-bezier(0.4,0,0.2,1)" }}
            />
          )}
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={`text-5xl font-black tracking-tight transition-colors duration-500 ${
              isGoalMet ? "text-emerald-300" : "text-white"
            }`}
          >
            {displayPct}%
          </span>
          <span className="text-blue-300 text-xs font-medium mt-0.5 tracking-wider uppercase">
            of goal
          </span>
          {isGoalMet && (
            <span className="text-emerald-400 text-lg mt-1">🎉</span>
          )}
        </div>
      </div>

      {/* ml display below donut */}
      <div className="flex items-end gap-1 -mt-2">
        <span className="text-3xl font-bold text-white tabular-nums">{current}</span>
        <span className="text-blue-300 text-base mb-0.5 font-medium">
          / {target} ml
        </span>
      </div>
      <p className="text-blue-400 text-xs mt-1">
        {current >= target
          ? "Daily goal reached! 💪"
          : `${target - current} ml to go`}
      </p>
    </div>
  );
}
