import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Wrench, Calendar, Image as ImageIcon, ChevronRight, X, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { SectionHeader } from '../components/StatCard';
import { EmptyState, SkeletonRow } from '../components/EmptyState';
import { Modal } from '../components/ConfirmDialog';
import { StatusBadge, StatusTimeline, serviceStatuses } from '../components/StatusBadge';
import type { ServiceRequestWithRelations, ServiceStatus, ServiceTimelineEntry, ProductRegistrationWithProduct, TechnicianWithProfile } from '../types';

const problemCategories = ['Hardware Issue', 'Software Issue', 'Screen Damage', 'Battery', 'Power Supply', 'Other'];

export function ServiceRequestsPage() {
  const { profile } = useAuth();
  const role = profile?.role ?? 'customer';
  const [requests, setRequests] = useState<ServiceRequestWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequestWithRelations | null>(null);
  const [registrations, setRegistrations] = useState<ProductRegistrationWithProduct[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianWithProfile[]>([]);

  const fetchRequests = async () => {
    setLoading(true);
    let query = supabase.from('service_requests').select('*, registration_id(*, product_id(*)), technician_id(*)').order('created_at', { ascending: false });
    if (role === 'customer' && profile?.id) query = query.eq('user_id', profile.id);
    else if (role === 'technician' && profile?.id) query = query.eq('technician_id', profile.id);
    if (statusFilter) query = query.eq('status', statusFilter);
    const { data } = await query;
    setRequests((data as ServiceRequestWithRelations[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchRequests(); }, [role, profile?.id, statusFilter]);

  const fetchFormData = async () => {
    if (!profile?.id) return;
    const [regs, techs] = await Promise.all([
      supabase.from('product_registrations').select('*, product_id(*)').eq('user_id', profile.id).eq('status', 'active'),
      supabase.from('technicians').select('*, profile_id(*)'),
    ]);
    setRegistrations((regs.data as ProductRegistrationWithProduct[]) ?? []);
    setTechnicians((techs.data as TechnicianWithProfile[]) ?? []);
  };

  const filtered = requests.filter((r) =>
    r.registration_id?.product_id?.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.problem_category.toLowerCase().includes(search.toLowerCase()) ||
    r.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <SectionHeader
        title="Service Requests"
        subtitle={role === 'customer' ? 'Track your repair requests' : role === 'technician' ? 'Jobs assigned to you' : 'All service requests'}
        action={role === 'customer' && (
          <button onClick={() => { fetchFormData(); setShowForm(true); }} className="btn-primary">
            <Plus className="w-5 h-5" /> New Request
          </button>
        )}
      />

      <div className="glass-card p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search requests..." className="glass-input pl-11" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="glass-input appearance-none cursor-pointer sm:max-w-[180px]">
          <option value="">All Status</option>
          {serviceStatuses.map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="glass-card p-6">
          {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Wrench} title="No service requests" message={role === 'customer' ? "Click 'New Request' to raise a complaint" : "No requests match your filters"} />
      ) : (
        <div className="space-y-3">
          {filtered.map((req, i) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setSelectedRequest(req)}
              className="glass-card p-5 cursor-pointer hover:shadow-glow transition-all"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center shrink-0">
                    <Wrench className="w-6 h-6 text-brand-500" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">{req.registration_id?.product_id?.name ?? 'Product'}</h3>
                    <p className="text-sm text-slate-400 truncate">{req.problem_category} — {req.description.slice(0, 60)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={req.status} />
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {showForm && (
        <ServiceRequestForm
          registrations={registrations}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchRequests(); }}
        />
      )}

      <AnimatePresence>
        {selectedRequest && (
          <ServiceRequestDetail
            request={selectedRequest}
            role={role}
            technicians={technicians}
            onClose={() => setSelectedRequest(null)}
            onUpdated={() => { fetchRequests(); setSelectedRequest(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function ServiceRequestForm({ registrations, onClose, onSaved }: {
  registrations: ProductRegistrationWithProduct[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    registration_id: '',
    problem_category: '',
    description: '',
    preferred_date: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.registration_id || !form.problem_category || !form.description) {
      toast('Please fill all required fields', 'warning');
      return;
    }
    if (!profile?.id) return;
    setSaving(true);
    const { error } = await supabase.from('service_requests').insert({
      user_id: profile.id,
      registration_id: form.registration_id,
      problem_category: form.problem_category,
      description: form.description,
      preferred_date: form.preferred_date || null,
      status: 'pending',
    });
    if (error) { toast('Failed to create request', 'error'); }
    else {
      await supabase.from('activities').insert({
        user_id: profile.id,
        type: 'service_request',
        description: `Created service request for ${form.problem_category}`,
      });
      toast('Service request created', 'success');
      onSaved();
    }
    setSaving(false);
  };

  return (
    <Modal open onClose={onClose} title="New Service Request" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Select Product *</label>
          <select value={form.registration_id} onChange={(e) => setForm({ ...form, registration_id: e.target.value })} className="glass-input appearance-none cursor-pointer">
            <option value="">Choose a registered product...</option>
            {registrations.map((r) => <option key={r.id} value={r.id}>{r.product_id?.name} — {r.serial_number}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Problem Category *</label>
          <select value={form.problem_category} onChange={(e) => setForm({ ...form, problem_category: e.target.value })} className="glass-input appearance-none cursor-pointer">
            <option value="">Select category...</option>
            {problemCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Description *</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="glass-input min-h-[100px] resize-none" placeholder="Describe the issue in detail..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Preferred Service Date</label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input type="date" value={form.preferred_date} onChange={(e) => setForm({ ...form, preferred_date: e.target.value })} className="glass-input pl-11" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Upload Images</label>
          <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center hover:border-brand-400 transition-colors cursor-pointer">
            <ImageIcon className="w-7 h-7 text-slate-400 mx-auto mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Upload photos of the issue</p>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Submit Request'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function ServiceRequestDetail({ request, role, technicians, onClose, onUpdated }: {
  request: ServiceRequestWithRelations;
  role: string;
  technicians: TechnicianWithProfile[];
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { toast } = useToast();
  const [timeline, setTimeline] = useState<ServiceTimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [notes, setNotes] = useState(request.technician_notes ?? '');
  const [estimatedDelivery, setEstimatedDelivery] = useState(request.estimated_delivery ?? '');

  const fetchTimeline = async () => {
    const { data } = await supabase
      .from('service_timeline')
      .select('*')
      .eq('service_request_id', request.id)
      .order('created_at', { ascending: true });
    setTimeline((data as ServiceTimelineEntry[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchTimeline(); }, [request.id]);

  const updateStatus = async (newStatus: ServiceStatus, note?: string) => {
    setUpdating(true);
    const { error: updateError } = await supabase.from('service_requests').update({ status: newStatus }).eq('id', request.id);
    if (updateError) { toast('Failed to update status', 'error'); setUpdating(false); return; }

    await supabase.from('service_timeline').insert({
      service_request_id: request.id,
      status: newStatus,
      note: note ?? '',
    });

    toast(`Status updated to ${newStatus}`, 'success');
    setUpdating(false);
    onUpdated();
  };

  const assignTechnician = async (techId: string) => {
    setUpdating(true);
    const { error } = await supabase.from('service_requests').update({ technician_id: techId, status: 'accepted' }).eq('id', request.id);
    if (error) { toast('Failed to assign technician', 'error'); }
    else {
      await supabase.from('service_timeline').insert({ service_request_id: request.id, status: 'accepted', note: 'Technician assigned' });
      toast('Technician assigned', 'success');
      onUpdated();
    }
    setUpdating(false);
  };

  const saveNotes = async () => {
    setUpdating(true);
    const { error } = await supabase.from('service_requests').update({
      technician_notes: notes,
      estimated_delivery: estimatedDelivery || null,
    }).eq('id', request.id);
    if (error) { toast('Failed to save notes', 'error'); }
    else { toast('Notes saved', 'success'); }
    setUpdating(false);
  };

  const canUpdate = role === 'admin' || role === 'technician';
  const currentStep = serviceStatuses.indexOf(request.status);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="glass-card p-6 max-w-2xl w-full my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{request.registration_id?.product_id?.name ?? 'Product'}</h3>
            <p className="text-sm text-slate-400">{request.registration_id?.product_id?.brand} · {request.registration_id?.serial_number}</p>
          </div>
          <button onClick={onClose} className="btn-ghost p-2"><X className="w-5 h-5" /></button>
        </div>

        <div className="glass-card p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-slate-700 dark:text-slate-200">Repair Progress</h4>
            <StatusBadge status={request.status} />
          </div>
          <StatusTimeline currentStatus={request.status} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="glass-card p-4">
            <p className="text-xs text-slate-400 mb-1">Problem Category</p>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{request.problem_category}</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs text-slate-400 mb-1">Created</p>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{new Date(request.created_at).toLocaleDateString()}</p>
          </div>
          <div className="glass-card p-4 sm:col-span-2">
            <p className="text-xs text-slate-400 mb-1">Description</p>
            <p className="text-sm text-slate-600 dark:text-slate-300">{request.description}</p>
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-6">
          <h4 className="font-medium text-slate-700 dark:text-slate-200 mb-3">Timeline</h4>
          {loading ? (
            <p className="text-sm text-slate-400">Loading timeline...</p>
          ) : timeline.length === 0 ? (
            <p className="text-sm text-slate-400">No updates yet</p>
          ) : (
            <div className="space-y-3">
              {timeline.map((entry, i) => (
                <div key={entry.id} className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${i === timeline.length - 1 ? 'bg-brand-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                      {i === timeline.length - 1 ? <CheckCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </div>
                    {i < timeline.length - 1 && <div className="w-0.5 h-6 bg-slate-200 dark:bg-slate-700" />}
                  </div>
                  <div className="pt-1">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200 capitalize">{entry.status}</p>
                    {entry.note && <p className="text-xs text-slate-400">{entry.note}</p>}
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(entry.created_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Admin/Technician controls */}
        {canUpdate && (
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            {role === 'admin' && !request.technician_id && (
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Assign Technician</label>
                <select
                  onChange={(e) => e.target.value && assignTechnician(e.target.value)}
                  className="glass-input appearance-none cursor-pointer"
                  defaultValue=""
                >
                  <option value="">Select technician...</option>
                  {technicians.map((t) => <option key={t.id} value={t.profile_id.id}>{t.profile_id?.full_name} — {t.specialization}</option>)}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Estimated Delivery</label>
                <input type="date" value={estimatedDelivery} onChange={(e) => setEstimatedDelivery(e.target.value)} className="glass-input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Update Status</label>
                <select
                  onChange={(e) => e.target.value && updateStatus(e.target.value as ServiceStatus)}
                  className="glass-input appearance-none cursor-pointer"
                  defaultValue=""
                  disabled={updating}
                >
                  <option value="">Change status...</option>
                  {serviceStatuses.filter((s) => serviceStatuses.indexOf(s) > currentStep).map((s) => <option key={s} value={s} className="capitalize">{s}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Repair Notes</label>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="glass-input min-h-[80px] resize-none" placeholder="Add repair notes..." />
              <button onClick={saveNotes} disabled={updating} className="btn-secondary mt-2">
                <CheckCircle className="w-4 h-4" /> Save Notes
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
