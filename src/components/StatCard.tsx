import { motion } from 'framer-motion';
import { type LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

export function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  color = 'brand',
  delay = 0,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  trend?: { value: string; up: boolean };
  color?: 'brand' | 'emerald' | 'amber' | 'violet' | 'rose' | 'teal';
  delay?: number;
}) {
  const colorMap = {
    brand: 'from-brand-500 to-brand-600 shadow-brand-500/30',
    emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-500/30',
    amber: 'from-amber-500 to-amber-600 shadow-amber-500/30',
    violet: 'from-violet-500 to-violet-600 shadow-violet-500/30',
    rose: 'from-rose-500 to-rose-600 shadow-rose-500/30',
    teal: 'from-teal-500 to-teal-600 shadow-teal-500/30',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ y: -4 }}
      className="glass-card p-5 group"
    >
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${colorMap[color]} flex items-center justify-center shadow-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trend.up ? 'text-emerald-500' : 'text-rose-500'}`}>
            {trend.up ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {trend.value}
          </div>
        )}
      </div>
      <p className="mt-4 text-3xl font-bold font-display text-slate-800 dark:text-white">{value}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{label}</p>
    </motion.div>
  );
}

export function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold font-display text-slate-800 dark:text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
