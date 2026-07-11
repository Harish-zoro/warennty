import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { QrCode, Upload, CheckCircle, Package, Calendar, Hash } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { SectionHeader } from '../components/StatCard';
import { EmptyState } from '../components/EmptyState';
import type { Product } from '../types';

export function RegisterProductPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [warrantyCode, setWarrantyCode] = useState('');
  const [form, setForm] = useState({
    product_id: '',
    serial_number: '',
    purchase_date: '',
    invoice_url: '',
  });

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('products').select('*').order('name');
      setProducts((data as Product[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product_id || !form.serial_number || !form.purchase_date) {
      toast('Please fill all required fields', 'warning');
      return;
    }
    if (!profile?.id) return;

    setSubmitting(true);
    const product = products.find((p) => p.id === form.product_id);
    const purchaseDate = new Date(form.purchase_date);
    const expiresAt = new Date(purchaseDate);
    expiresAt.setMonth(expiresAt.getMonth() + (product?.warranty_months ?? 12));

    const { data, error } = await supabase.from('product_registrations').insert({
      user_id: profile.id,
      product_id: form.product_id,
      serial_number: form.serial_number,
      purchase_date: form.purchase_date,
      invoice_url: form.invoice_url,
      warranty_expires_at: expiresAt.toISOString().split('T')[0],
    }).select().single();

    if (error) {
      toast('Failed to register product', 'error');
      setSubmitting(false);
    } else {
      setWarrantyCode((data as { warranty_card_code: string }).warranty_card_code);
      setSuccess(true);
      await supabase.from('activities').insert({
        user_id: profile.id,
        type: 'registration',
        description: `Registered ${product?.name ?? 'product'} with serial ${form.serial_number}`,
      });
      setSubmitting(false);
    }
  };

  if (loading) return <div><SectionHeader title="Register Product" /><EmptyState icon={Package} title="Loading..." message="" /></div>;

  if (success) {
    return (
      <div>
        <SectionHeader title="Product Registered!" subtitle="Your digital warranty card has been generated" />
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto text-center">
          <div className="w-20 h-20 rounded-3xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Registration Successful</h3>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Your warranty card code:</p>
          <div className="mt-4 glass-card p-6">
            <div className="flex items-center justify-center gap-3">
              <QrCode className="w-8 h-8 text-brand-500" />
              <span className="text-2xl font-mono font-bold text-gradient">{warrantyCode}</span>
            </div>
          </div>
          <button onClick={() => { setSuccess(false); setForm({ product_id: '', serial_number: '', purchase_date: '', invoice_url: '' }); }} className="btn-secondary mt-6">
            Register Another Product
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader title="Register Product" subtitle="Activate your warranty by registering your purchase" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Select Product *</label>
              <select value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })} className="glass-input appearance-none cursor-pointer">
                <option value="">Choose a product...</option>
                {products.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.brand} {p.model}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Serial Number *</label>
              <div className="relative">
                <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} className="glass-input pl-11" placeholder="SN123456789" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Purchase Date *</label>
              <div className="relative">
                <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input type="date" value={form.purchase_date} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} className="glass-input pl-11" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Upload Invoice</label>
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center hover:border-brand-400 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">Click to upload or drag and drop</p>
                <p className="text-xs text-slate-400 mt-1">PDF, PNG, JPG up to 10MB</p>
              </div>
            </div>
            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><QrCode className="w-5 h-5" /> Activate Warranty</>}
            </button>
          </form>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">How It Works</h3>
          <div className="space-y-4">
            {[
              { step: 1, title: 'Select Product', desc: 'Choose from our product catalog' },
              { step: 2, title: 'Enter Details', desc: 'Provide serial number and purchase date' },
              { step: 3, title: 'Upload Invoice', desc: 'Attach proof of purchase' },
              { step: 4, title: 'Get Warranty Card', desc: 'Receive your digital warranty card instantly' },
            ].map((s) => (
              <div key={s.step} className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-950/40 flex items-center justify-center text-brand-600 dark:text-brand-300 font-semibold text-sm shrink-0">
                  {s.step}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{s.title}</p>
                  <p className="text-xs text-slate-400">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
