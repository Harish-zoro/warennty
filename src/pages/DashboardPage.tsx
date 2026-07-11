import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Package, ShieldCheck, Wrench, CheckCircle, Users, Clock,
  AlertTriangle, ArrowRight, Activity as ActivityIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { StatCard, SectionHeader } from '../components/StatCard';
import { BarChart, DonutChart } from '../components/Charts';
import { SkeletonCard } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';
import type { ServiceRequestWithRelations, ProductRegistrationWithProduct, Activity } from '../types';

export function DashboardPage() {
  const { profile } = useAuth();
  const role = profile?.role ?? 'customer';
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [recentRequests, setRecentRequests] = useState<ServiceRequestWithRelations[]>([]);
  const [registrations, setRegistrations] = useState<ProductRegistrationWithProduct[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [monthlyData, setMonthlyData] = useState<number[]>([0, 0, 0, 0, 0, 0]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        if (role === 'admin') {
          const [products, warranties, pending, completed, customers, technicians, reqs, acts] = await Promise.all([
            supabase.from('products').select('*', { count: 'exact', head: true }),
            supabase.from('product_registrations').select('*', { count: 'exact', head: true }).eq('status', 'active'),
            supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
            supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
            supabase.from('technicians').select('*', { count: 'exact', head: true }),
            supabase.from('service_requests').select('*, registration_id(*, product_id(*))').order('created_at', { ascending: false }).limit(5),
            supabase.from('activities').select('*').order('created_at', { ascending: false }).limit(6),
          ]);

          setStats({
            products: products.count ?? 0,
            warranties: warranties.count ?? 0,
            pending: pending.count ?? 0,
            completed: completed.count ?? 0,
            customers: customers.count ?? 0,
            technicians: technicians.count ?? 0,
          });
          setRecentRequests(reqs.data as ServiceRequestWithRelations[] ?? []);
          setActivities(acts.data as Activity[] ?? []);
        } else if (role === 'customer') {
          const uid = profile?.id;
          if (!uid) return;
          const [regs, reqs, acts] = await Promise.all([
            supabase.from('product_registrations').select('*, product_id(*)').eq('user_id', uid).order('created_at', { ascending: false }),
            supabase.from('service_requests').select('*, registration_id(*, product_id(*))').eq('user_id', uid).order('created_at', { ascending: false }).limit(5),
            supabase.from('activities').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(6),
          ]);

          const regData = regs.data as ProductRegistrationWithProduct[] ?? [];
          setRegistrations(regData);
          const activeW = regData.filter((r) => r.status === 'active').length;
          const expiringSoon = regData.filter((r) => {
            if (r.status !== 'active') return false;
            const days = Math.ceil((new Date(r.warranty_expires_at).getTime() - Date.now()) / 86400000);
            return days <= 30 && days >= 0;
          }).length;
          const reqData = reqs.data as ServiceRequestWithRelations[] ?? [];
          setStats({
            registered: regData.length,
            activeWarranty: activeW,
            expiringSoon,
            serviceRequests: reqData.length,
          });
          setRecentRequests(reqData);
          setActivities(acts.data as Activity[] ?? []);
        } else if (role === 'technician') {
          const uid = profile?.id;
          if (!uid) return;
          const [assigned, pending, completed, reqs] = await Promise.all([
            supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('technician_id', uid),
            supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('technician_id', uid).in('status', ['accepted', 'repairing']),
            supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('technician_id', uid).eq('status', 'completed'),
            supabase.from('service_requests').select('*, registration_id(*, product_id(*))').eq('technician_id', uid).order('created_at', { ascending: false }).limit(5),
          ]);

          setStats({
            assigned: assigned.count ?? 0,
            pending: pending.count ?? 0,
            completed: completed.count ?? 0,
          });
          setRecentRequests(reqs.data as ServiceRequestWithRelations[] ?? []);
        }

        // Mock monthly data
        setMonthlyData([12, 19, 15, 25, 22, 30].map((v) => Math.max(1, Math.floor(v * (0.5 + Math.random() * 0.5)))));
      } finally {
        setLoading(false);
      }
    })();
  }, [role, profile?.id]);

  if (loading) {
    return (
      <div>
        <SectionHeader title="Dashboard" subtitle="Loading your overview..." />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader
        title={`Welcome, ${profile?.full_name?.split(' ')[0] ?? 'User'}!`}
        subtitle={role === 'admin' ? 'System-wide overview and analytics' : role === 'technician' ? 'Your assigned jobs and repair status' : 'Your products, warranties, and service requests'}
      />

      {role === 'admin' && <AdminDashboard stats={stats} recentRequests={recentRequests} activities={activities} monthlyData={monthlyData} />}
      {role === 'customer' && <CustomerDashboard stats={stats} registrations={registrations} recentRequests={recentRequests} activities={activities} />}
      {role === 'technician' && <TechnicianDashboard stats={stats} recentRequests={recentRequests} />}
    </div>
  );
}

function AdminDashboard({ stats, recentRequests, activities, monthlyData }: {
  stats: Record<string, number>;
  recentRequests: ServiceRequestWithRelations[];
  activities: Activity[];
  monthlyData: number[];
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={Package} label="Total Products" value={stats.products ?? 0} color="brand" delay={0} />
        <StatCard icon={ShieldCheck} label="Active Warranties" value={stats.warranties ?? 0} color="emerald" delay={0.05} />
        <StatCard icon={Clock} label="Pending Requests" value={stats.pending ?? 0} color="amber" delay={0.1} />
        <StatCard icon={CheckCircle} label="Completed Repairs" value={stats.completed ?? 0} color="teal" delay={0.15} />
        <StatCard icon={Users} label="Customers" value={stats.customers ?? 0} color="violet" delay={0.2} />
        <StatCard icon={Wrench} label="Technicians" value={stats.technicians ?? 0} color="rose" delay={0.25} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6 lg:col-span-2">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Monthly Service Requests</h3>
          <BarChart data={monthlyData} labels={['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']} />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="glass-card p-6">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Request Status</h3>
          <DonutChart
            segments={[
              { label: 'Pending', value: stats.pending ?? 0, color: '#f59e0b' },
              { label: 'Completed', value: stats.completed ?? 0, color: '#10b981' },
              { label: 'Active Warranties', value: stats.warranties ?? 0, color: '#3b82f6' },
            ]}
          />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-6">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Recent Service Requests</h3>
          {recentRequests.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No service requests yet</p>
          ) : (
            <div className="space-y-3">
              {recentRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{req.registration_id?.product_id?.name ?? 'Unknown product'}</p>
                    <p className="text-xs text-slate-400">{req.problem_category}</p>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="glass-card p-6">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Recent Activities</h3>
          {activities.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No recent activity</p>
          ) : (
            <div className="space-y-3">
              {activities.map((act) => (
                <div key={act.id} className="flex items-start gap-3 py-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center shrink-0">
                    <ActivityIcon className="w-4 h-4 text-brand-500" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-700 dark:text-slate-200">{act.description}</p>
                    <p className="text-xs text-slate-400">{new Date(act.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function CustomerDashboard({ stats, registrations, recentRequests, activities }: {
  stats: Record<string, number>;
  registrations: ProductRegistrationWithProduct[];
  recentRequests: ServiceRequestWithRelations[];
  activities: Activity[];
}) {
  const expiringWarranties = registrations.filter((r) => {
    if (r.status !== 'active') return false;
    const days = Math.ceil((new Date(r.warranty_expires_at).getTime() - Date.now()) / 86400000);
    return days <= 30 && days >= 0;
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package} label="Registered Products" value={stats.registered ?? 0} color="brand" delay={0} />
        <StatCard icon={ShieldCheck} label="Active Warranty" value={stats.activeWarranty ?? 0} color="emerald" delay={0.05} />
        <StatCard icon={AlertTriangle} label="Expiring Soon" value={stats.expiringSoon ?? 0} color="amber" delay={0.1} />
        <StatCard icon={Wrench} label="Service Requests" value={stats.serviceRequests ?? 0} color="violet" delay={0.15} />
      </div>

      {expiringWarranties.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-5 border-l-4 border-amber-400">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Warranty Expiring Soon</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                {expiringWarranties.length} product{expiringWarranties.length > 1 ? 's have' : ' has'} warranty expiring within 30 days.
              </p>
              <div className="mt-3 space-y-1">
                {expiringWarranties.slice(0, 3).map((w) => (
                  <p key={w.id} className="text-sm text-slate-600 dark:text-slate-300">
                    {w.product_id?.name} — expires {new Date(w.warranty_expires_at).toLocaleDateString()}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card p-6">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Repair Status Timeline</h3>
          {recentRequests.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No service requests yet</p>
          ) : (
            <div className="space-y-3">
              {recentRequests.map((req) => (
                <div key={req.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{req.registration_id?.product_id?.name ?? 'Product'}</p>
                    <p className="text-xs text-slate-400">{req.problem_category}</p>
                  </div>
                  <StatusBadge status={req.status} />
                </div>
              ))}
            </div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Notifications & Activity</h3>
          {activities.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No notifications</p>
          ) : (
            <div className="space-y-3">
              {activities.map((act) => (
                <div key={act.id} className="flex items-start gap-3 py-2">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center shrink-0">
                    <ActivityIcon className="w-4 h-4 text-brand-500" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-700 dark:text-slate-200">{act.description}</p>
                    <p className="text-xs text-slate-400">{new Date(act.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function TechnicianDashboard({ stats, recentRequests }: { stats: Record<string, number>; recentRequests: ServiceRequestWithRelations[] }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Wrench} label="Assigned Jobs" value={stats.assigned ?? 0} color="brand" delay={0} />
        <StatCard icon={Clock} label="Pending Repairs" value={stats.pending ?? 0} color="amber" delay={0.05} />
        <StatCard icon={CheckCircle} label="Completed Repairs" value={stats.completed ?? 0} color="emerald" delay={0.1} />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-6">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Today's Tasks</h3>
        {recentRequests.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">No jobs assigned yet</p>
        ) : (
          <div className="space-y-3">
            {recentRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-brand-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{req.registration_id?.product_id?.name ?? 'Product'}</p>
                    <p className="text-xs text-slate-400">{req.problem_category} — {req.description.slice(0, 50)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={req.status} />
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
