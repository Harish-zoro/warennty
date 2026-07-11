import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { PackageOpen } from 'lucide-react';

export function EmptyState({
  icon: Icon = PackageOpen,
  title,
  message,
  action,
}: {
  icon?: typeof PackageOpen;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 text-center"
    >
      <div className="w-20 h-20 rounded-3xl bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center mb-4">
        <Icon className="w-10 h-10 text-brand-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">{title}</h3>
      <p className="mt-1 text-sm text-slate-400 dark:text-slate-500 max-w-sm">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}

export function SkeletonCard() {
  return (
    <div className="glass-card p-5">
      <div className="skeleton h-32 w-full mb-4" />
      <div className="skeleton h-4 w-3/4 mb-2" />
      <div className="skeleton h-4 w-1/2" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-4">
      <div className="skeleton h-10 w-10 rounded-full" />
      <div className="flex-1">
        <div className="skeleton h-4 w-1/3 mb-2" />
        <div className="skeleton h-3 w-1/4" />
      </div>
      <div className="skeleton h-6 w-20 rounded-full" />
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-4 border-brand-200/30" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-500 animate-spin" />
      </div>
    </div>
  );
}
