import type { ServiceStatus } from '../types';
import { Clock, CheckCircle, Wrench, PackageCheck, Truck } from 'lucide-react';

const statusConfig: Record<ServiceStatus, { label: string; classes: string; icon: typeof Clock; step: number }> = {
  pending: { label: 'Pending', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', icon: Clock, step: 0 },
  accepted: { label: 'Accepted', classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300', icon: CheckCircle, step: 1 },
  repairing: { label: 'Repairing', classes: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300', icon: Wrench, step: 2 },
  completed: { label: 'Completed', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: PackageCheck, step: 3 },
  delivered: { label: 'Delivered', classes: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300', icon: Truck, step: 4 },
};

export function StatusBadge({ status }: { status: ServiceStatus }) {
  const cfg = statusConfig[status];
  const Icon = cfg.icon;
  return (
    <span className={`badge ${cfg.classes}`}>
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
}

export const serviceStatuses: ServiceStatus[] = ['pending', 'accepted', 'repairing', 'completed', 'delivered'];

export function StatusTimeline({ currentStatus }: { currentStatus: ServiceStatus }) {
  const currentStep = statusConfig[currentStatus].step;
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {serviceStatuses.map((s, i) => {
        const cfg = statusConfig[s];
        const Icon = cfg.icon;
        const done = i <= currentStep;
        return (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                  done
                    ? 'bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/30'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className={`text-[10px] font-medium hidden sm:block ${done ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400'}`}>
                {cfg.label}
              </span>
            </div>
            {i < serviceStatuses.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 rounded-full transition-all duration-500 ${i < currentStep ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}
