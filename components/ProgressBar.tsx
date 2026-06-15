"use client";

interface ProgressBarProps {
  current: number;
  target: number;
}

export default function ProgressBar({ current, target }: ProgressBarProps) {
  const percentage = Math.min(Math.round((current / target) * 100), 100);
  const isGoalMet = current >= target;

  return (
    <div className="w-full">
      <div className="flex justify-between items-end mb-3">
        <div>
          <span className="text-4xl font-bold text-white tracking-tight">
            {current}
          </span>
          <span className="text-blue-200 text-lg ml-1 font-medium">ml</span>
        </div>
        <div className="text-right">
          <span
            className={`text-2xl font-bold transition-colors duration-500 ${
              isGoalMet ? "text-emerald-300" : "text-blue-200"
            }`}
          >
            {percentage}%
          </span>
          <p className="text-blue-300 text-xs mt-0.5">of {target} ml goal</p>
        </div>
      </div>

      {/* Track */}
      <div className="relative h-4 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
        {/* Fill */}
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${
            isGoalMet
              ? "bg-gradient-to-r from-emerald-400 to-teal-300"
              : "bg-gradient-to-r from-blue-400 to-cyan-300"
          }`}
          style={{ width: `${percentage}%` }}
        />
        {/* Shimmer */}
        {percentage > 5 && (
          <div
            className="absolute inset-y-0 left-0 rounded-full overflow-hidden"
            style={{ width: `${percentage}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
          </div>
        )}
      </div>

      {isGoalMet && (
        <p className="text-center text-emerald-300 text-sm font-semibold mt-3 animate-pulse">
          🎉 Daily goal reached!
        </p>
      )}
    </div>
  );
}
