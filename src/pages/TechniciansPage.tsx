import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Trash2, Wrench, Mail, Phone, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { SectionHeader } from '../components/StatCard';
import { EmptyState, PageLoader } from '../components/EmptyState';
import { ConfirmDialog, Modal } from '../components/ConfirmDialog';
import type { TechnicianWithProfile, Profile } from '../types';

export function TechniciansPage() {
  const { toast } = useToast();
  const [technicians, setTechnicians] = useState<TechnicianWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [customers, setCustomers] = useState<Profile[]>([]);

  const fetchTechnicians = async () => {
    setLoading(true);
    const { data } = await supabase.from('technicians').select('*, profile_id(*)').order('created_at', { ascending: false });
    setTechnicians((data as TechnicianWithProfile[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchTechnicians(); }, []);

  const fetchCustomers = async () => {
    const { data } = await supabase.from('profiles').select('*').eq('role', 'customer').order('full_name', { ascending: true });
    setCustomers((data as Profile[]) ?? []);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('technicians').delete().eq('id', deleteId);
    if (error) { toast('Failed to remove technician', 'error'); }
    else { toast('Technician removed', 'success'); fetchTechnicians(); }
    setDeleteId(null);
  };

  const filtered = technicians.filter((t) =>
    t.profile_id?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    t.specialization?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <SectionHeader
        title="Technician Management"
        subtitle="Manage service technicians and their specializations"
        action={
          <button onClick={() => { fetchCustomers(); setShowForm(true); }} className="btn-primary">
            <Plus className="w-5 h-5" /> Add Technician
          </button>
        }
      />

      <div className="glass-card p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or specialization..."
            className="glass-input pl-11"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><PageLoader /></div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Wrench} title="No technicians found" message={search ? "Try adjusting your search" : "Add technicians to assign them to service requests"} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((tech, i) => (
            <motion.div
              key={tech.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-5 group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-white font-semibold text-lg shadow-lg shadow-brand-500/30">
                    {tech.profile_id?.full_name?.charAt(0).toUpperCase() ?? 'T'}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100">{tech.profile_id?.full_name ?? 'Unknown'}</h3>
                    <span className="badge bg-brand-50 dark:bg-brand-950/40 text-brand-600 dark:text-brand-300 mt-1">{tech.specialization}</span>
                  </div>
                </div>
                <button onClick={() => setDeleteId(tech.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="mt-4 space-y-2 text-sm text-slate-500 dark:text-slate-400">
                {tech.profile_id?.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    {tech.profile_id.phone}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${tech.status === 'available' ? 'bg-emerald-500' : tech.status === 'busy' ? 'bg-amber-500' : 'bg-slate-400'}`} />
                  <span className="capitalize">{tech.status}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showForm && (
        <TechnicianForm customers={customers} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetchTechnicians(); }} />
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Remove Technician"
        message="Are you sure you want to remove this technician? They will no longer be available for service assignments."
        confirmLabel="Remove"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

function TechnicianForm({ customers, onClose, onSaved }: { customers: Profile[]; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ profile_id: '', specialization: 'Electronics Repair' });

  const specializations = ['Electronics Repair', 'Home Appliance', 'Mobile Repair', 'Computer Hardware', 'Audio Systems', 'General Service'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.profile_id) { toast('Please select a customer', 'warning'); return; }
    setSaving(true);
    const { data: existing } = await supabase.from('technicians').select('id').eq('profile_id', form.profile_id).maybeSingle();
    if (existing) {
      setSaving(false);
      toast('This user is already a technician', 'error');
      return;
    }
    const { error: techError } = await supabase.from('technicians').insert({ profile_id: form.profile_id, specialization: form.specialization });
    if (techError) {
      setSaving(false);
      toast('Failed to add technician', 'error');
      return;
    }
    await supabase.from('profiles').update({ role: 'technician' }).eq('id', form.profile_id);
    setSaving(false);
    toast('Technician added', 'success');
    onSaved();
  };

  return (
    <Modal open onClose={onClose} title="Add Technician" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Select Customer</label>
          <select value={form.profile_id} onChange={(e) => setForm({ ...form, profile_id: e.target.value })} className="glass-input appearance-none cursor-pointer">
            <option value="">Choose a customer...</option>
            {customers.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Specialization</label>
          <select value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} className="glass-input appearance-none cursor-pointer">
            {specializations.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? <PageLoader /> : null}
            Add Technician
          </button>
        </div>
      </form>
    </Modal>
  );
}
