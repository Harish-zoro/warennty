import { motion } from 'framer-motion';

export function BarChart({ data, labels, height = 200 }: { data: number[]; labels: string[]; height?: number }) {
  const max = Math.max(...data, 1);
  const barWidth = 100 / data.length;

  return (
    <div className="w-full" style={{ height }}>
      <div className="flex items-end justify-between h-full gap-2">
        {data.map((value, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{value}</span>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(value / max) * 100}%` }}
              transition={{ delay: i * 0.05, duration: 0.5, ease: 'easeOut' }}
              className="w-full rounded-t-lg bg-gradient-to-t from-brand-500 to-brand-400 min-h-[4px] hover:from-brand-600 hover:to-brand-500 transition-colors"
              style={{ maxWidth: `${barWidth * 3}%` }}
            />
            <span className="text-xs text-slate-400 dark:text-slate-500">{labels[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DonutChart({ segments, size = 160 }: { segments: { label: string; value: number; color: string }[]; size?: number }) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth="16" className="stroke-slate-100 dark:stroke-slate-800" />
          {segments.map((seg, i) => {
            const dash = (seg.value / total) * circumference;
            const circle = (
              <motion.circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                strokeWidth="16"
                stroke={seg.color}
                strokeLinecap="round"
                initial={{ strokeDasharray: `0 ${circumference}` }}
                animate={{ strokeDasharray: `${dash} ${circumference - dash}` }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                style={{ strokeDashoffset: -offset }}
              />
            );
            offset += dash;
            return circle;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold font-display text-slate-800 dark:text-white">{total}</span>
          <span className="text-xs text-slate-400">Total</span>
        </div>
      </div>
      <div className="space-y-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: seg.color }} />
            <span className="text-sm text-slate-600 dark:text-slate-300">{seg.label}</span>
            <span className="text-sm font-semibold text-slate-800 dark:text-white ml-auto">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
