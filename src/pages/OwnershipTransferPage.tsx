import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, ArrowLeftRight, User, Mail, Phone, Check, X, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { SectionHeader } from '../components/StatCard';
import { EmptyState, SkeletonRow } from '../components/EmptyState';
import { Modal, ConfirmDialog } from '../components/ConfirmDialog';
import type { OwnershipTransferWithRelations, ProductRegistrationWithProduct } from '../types';

export function OwnershipTransferPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const role = profile?.role ?? 'customer';
  const [transfers, setTransfers] = useState<OwnershipTransferWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [registrations, setRegistrations] = useState<ProductRegistrationWithProduct[]>([]);
  const [approveId, setApproveId] = useState<{ id: string; approved: boolean } | null>(null);

  const fetchTransfers = async () => {
    setLoading(true);
    let query = supabase.from('ownership_transfers').select('*, registration_id(*, product_id(*))').order('created_at', { ascending: false });
    if (role === 'customer' && profile?.id) query = query.eq('from_user_id', profile.id);
    const { data } = await query;
    setTransfers((data as OwnershipTransferWithRelations[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchTransfers(); }, [role, profile?.id]);

  const fetchRegistrations = async () => {
    if (!profile?.id) return;
    const { data } = await supabase.from('product_registrations').select('*, product_id(*)').eq('user_id', profile.id).eq('status', 'active');
    setRegistrations((data as ProductRegistrationWithProduct[]) ?? []);
  };

  const handleResolve = async () => {
    if (!approveId) return;
    const { error } = await supabase.from('ownership_transfers')
      .update({ status: approveId.approved ? 'approved' : 'rejected', resolved_at: new Date().toISOString() })
      .eq('id', approveId.id);
    if (error) { toast('Failed to update transfer', 'error'); }
    else {
      toast(approveId.approved ? 'Transfer approved' : 'Transfer rejected', 'success');
      fetchTransfers();
    }
    setApproveId(null);
  };

  const statusConfig = {
    pending: { label: 'Pending', classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300', icon: Clock },
    approved: { label: 'Approved', classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300', icon: Check },
    rejected: { label: 'Rejected', classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300', icon: X },
  };

  return (
    <div>
      <SectionHeader
        title="Ownership Transfer"
        subtitle={role === 'admin' ? 'Review and approve ownership transfer requests' : 'Transfer your product to a new owner'}
        action={role === 'customer' && (
          <button onClick={() => { fetchRegistrations(); setShowForm(true); }} className="btn-primary">
            <Plus className="w-5 h-5" /> Transfer Product
          </button>
        )}
      />

      {loading ? (
        <div className="glass-card p-6">{[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}</div>
      ) : transfers.length === 0 ? (
        <EmptyState icon={ArrowLeftRight} title="No transfers" message={role === 'customer' ? "Transfer ownership of your products to someone else" : "No ownership transfer requests to review"} />
      ) : (
        <div className="space-y-3">
          {transfers.map((transfer, i) => {
            const cfg = statusConfig[transfer.status];
            const Icon = cfg.icon;
            return (
              <motion.div
                key={transfer.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center shrink-0">
                      <ArrowLeftRight className="w-6 h-6 text-brand-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-100">{transfer.registration_id?.product_id?.name ?? 'Product'}</h3>
                      <p className="text-sm text-slate-400">Serial: {transfer.registration_id?.serial_number}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400"><User className="w-3.5 h-3.5" /> {transfer.to_name}</span>
                        <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400"><Mail className="w-3.5 h-3.5" /> {transfer.to_email}</span>
                        {transfer.to_phone && <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400"><Phone className="w-3.5 h-3.5" /> {transfer.to_phone}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`badge ${cfg.classes}`}>
                      <Icon className="w-3.5 h-3.5" /> {cfg.label}
                    </span>
                    {role === 'admin' && transfer.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => setApproveId({ id: transfer.id, approved: true })} className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/40">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setApproveId({ id: transfer.id, approved: false })} className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/40">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-3">Requested on {new Date(transfer.created_at).toLocaleDateString()}</p>
              </motion.div>
            );
          })}
        </div>
      )}

      {showForm && (
        <TransferForm registrations={registrations} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetchTransfers(); }} />
      )}

      <ConfirmDialog
        open={!!approveId}
        title={approveId?.approved ? 'Approve Transfer' : 'Reject Transfer'}
        message={approveId?.approved ? 'Approve this ownership transfer request?' : 'Reject this ownership transfer request?'}
        confirmLabel={approveId?.approved ? 'Approve' : 'Reject'}
        onConfirm={handleResolve}
        onCancel={() => setApproveId(null)}
      />
    </div>
  );
}

function TransferForm({ registrations, onClose, onSaved }: { registrations: ProductRegistrationWithProduct[]; onClose: () => void; onSaved: () => void }) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ registration_id: '', to_name: '', to_email: '', to_phone: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.registration_id || !form.to_name || !form.to_email) { toast('Please fill required fields', 'warning'); return; }
    if (!profile?.id) return;
    setSaving(true);
    const { error } = await supabase.from('ownership_transfers').insert({
      registration_id: form.registration_id,
      from_user_id: profile.id,
      to_name: form.to_name,
      to_email: form.to_email,
      to_phone: form.to_phone,
      status: 'pending',
    });
    if (error) { toast('Failed to create transfer request', 'error'); }
    else {
      await supabase.from('activities').insert({
        user_id: profile.id,
        type: 'transfer',
        description: `Initiated ownership transfer to ${form.to_name}`,
      });
      toast('Transfer request created', 'success');
      onSaved();
    }
    setSaving(false);
  };

  return (
    <Modal open onClose={onClose} title="Transfer Product Ownership" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Select Product *</label>
          <select value={form.registration_id} onChange={(e) => setForm({ ...form, registration_id: e.target.value })} className="glass-input appearance-none cursor-pointer">
            <option value="">Choose a product...</option>
            {registrations.map((r) => <option key={r.id} value={r.id}>{r.product_id?.name} — {r.serial_number}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">New Owner Name *</label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input value={form.to_name} onChange={(e) => setForm({ ...form, to_name: e.target.value })} className="glass-input pl-11" placeholder="John Doe" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">New Owner Email *</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="email" value={form.to_email} onChange={(e) => setForm({ ...form, to_email: e.target.value })} className="glass-input pl-11" placeholder="newowner@example.com" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">New Owner Phone</label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input value={form.to_phone} onChange={(e) => setForm({ ...form, to_phone: e.target.value })} className="glass-input pl-11" placeholder="+1 234 567 890" />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Submit Transfer'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
