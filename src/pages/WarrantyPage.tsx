import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, QrCode, Calendar, Download, AlertTriangle, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { SectionHeader } from '../components/StatCard';
import { EmptyState, SkeletonCard } from '../components/EmptyState';
import type { ProductRegistrationWithProduct } from '../types';

export function WarrantyPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [registrations, setRegistrations] = useState<ProductRegistrationWithProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ProductRegistrationWithProduct | null>(null);

  useEffect(() => {
    (async () => {
      if (!profile?.id) return;
      const { data } = await supabase
        .from('product_registrations')
        .select('*, product_id(*)')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      setRegistrations((data as ProductRegistrationWithProduct[]) ?? []);
      setLoading(false);
    })();
  }, [profile?.id]);

  const getDaysLeft = (expiresAt: string) => Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);

  return (
    <div>
      <SectionHeader title="My Warranties" subtitle="View your digital warranty cards and coverage details" />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : registrations.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title="No warranties yet"
          message="Register a product to activate your digital warranty card"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {registrations.map((reg, i) => {
            const daysLeft = getDaysLeft(reg.warranty_expires_at);
            const isExpired = reg.status === 'expired' || daysLeft < 0;
            const isExpiring = daysLeft >= 0 && daysLeft <= 30;
            return (
              <motion.div
                key={reg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -4 }}
                onClick={() => setSelected(reg)}
                className="glass-card p-5 cursor-pointer relative overflow-hidden"
              >
                <div className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl opacity-20 ${isExpired ? 'bg-red-500' : isExpiring ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/30">
                    <ShieldCheck className="w-6 h-6 text-white" />
                  </div>
                  {isExpired ? (
                    <span className="badge bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"><AlertTriangle className="w-3.5 h-3.5" /> Expired</span>
                  ) : isExpiring ? (
                    <span className="badge bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"><AlertTriangle className="w-3.5 h-3.5" /> {daysLeft}d left</span>
                  ) : (
                    <span className="badge bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"><CheckCircle className="w-3.5 h-3.5" /> Active</span>
                  )}
                </div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-100">{reg.product_id?.name ?? 'Product'}</h3>
                <p className="text-sm text-slate-400">{reg.product_id?.brand} · {reg.product_id?.model}</p>
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Serial</span>
                    <span className="font-mono text-slate-600 dark:text-slate-300">{reg.serial_number}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Expires</span>
                    <span className="font-medium text-slate-600 dark:text-slate-300">{new Date(reg.warranty_expires_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {selected && (
        <WarrantyCardModal reg={selected} onClose={() => setSelected(null)} onDownload={() => toast('Warranty card downloaded', 'success')} />
      )}
    </div>
  );
}

function WarrantyCardModal({ reg, onClose, onDownload }: { reg: ProductRegistrationWithProduct; onClose: () => void; onDownload: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-card p-8 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative bg-gradient-to-br from-brand-600 to-brand-900 rounded-2xl p-6 text-white overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand-400/20 rounded-full blur-3xl" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6" />
                <span className="font-bold font-display">Warranty Card</span>
              </div>
              <div className="w-16 h-16 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                <QrCode className="w-10 h-10" />
              </div>
            </div>
            <h3 className="text-xl font-bold">{reg.product_id?.name}</h3>
            <p className="text-brand-100 text-sm">{reg.product_id?.brand} · {reg.product_id?.model}</p>
            <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-brand-200 text-xs">Serial Number</p>
                <p className="font-mono font-medium">{reg.serial_number}</p>
              </div>
              <div>
                <p className="text-brand-200 text-xs">Warranty Code</p>
                <p className="font-mono font-medium">{reg.warranty_card_code}</p>
              </div>
              <div>
                <p className="text-brand-200 text-xs">Purchase Date</p>
                <p className="font-medium">{new Date(reg.purchase_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-brand-200 text-xs">Valid Until</p>
                <p className="font-medium">{new Date(reg.warranty_expires_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Warranty Terms</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">{reg.product_id?.warranty_terms || 'Standard manufacturer warranty covering manufacturing defects.'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Coverage</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">{reg.product_id?.coverage_details || 'Parts and labor covered for manufacturing defects.'}</p>
          </div>
        </div>
        <button onClick={onDownload} className="btn-primary w-full mt-6">
          <Download className="w-5 h-5" /> Download Warranty Card
        </button>
      </motion.div>
    </motion.div>
  );
}
