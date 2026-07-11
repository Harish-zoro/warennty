import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Pencil, Trash2, Package, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { SectionHeader } from '../components/StatCard';
import { EmptyState, SkeletonCard, PageLoader } from '../components/EmptyState';
import { ConfirmDialog, Modal } from '../components/ConfirmDialog';
import type { Product } from '../types';

const categories = ['Electronics', 'Home Appliance', 'Mobile', 'Computer', 'Audio', 'Other'];
const placeholderImages = [
  'https://images.pexels.com/photos/1029757/pexels-photo-1029757.jpeg',
  'https://images.pexels.com/photos/7976464/pexels-photo-7976464.jpeg',
  'https://images.pexels.com/photos/7448186/pexels-photo-7448186.jpeg',
  'https://images.pexels.com/photos/1841841/pexels-photo-1841841.jpeg',
];

export function ProductsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const isAdmin = profile?.role === 'admin';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const pageSize = 8;

  const fetchProducts = async () => {
    setLoading(true);
    let query = supabase.from('products').select('*').order('created_at', { ascending: false });
    if (category) query = query.eq('category', category);
    const { data } = await query;
    setProducts((data as Product[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchProducts(); }, [category]);

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.brand.toLowerCase().includes(search.toLowerCase()) ||
    p.model.toLowerCase().includes(search.toLowerCase())
  );
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from('products').delete().eq('id', deleteId);
    if (error) { toast('Failed to delete product', 'error'); }
    else { toast('Product deleted', 'success'); fetchProducts(); }
    setDeleteId(null);
  };

  return (
    <div>
      <SectionHeader
        title="Product Catalog"
        subtitle={isAdmin ? 'Manage your product inventory' : 'Browse available products'}
        action={isAdmin && (
          <button onClick={() => { setEditProduct(null); setShowForm(true); }} className="btn-primary">
            <Plus className="w-5 h-5" /> Add Product
          </button>
        )}
      />

      <div className="glass-card p-4 mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name, brand, or model..."
            className="glass-input pl-11"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="glass-input pl-11 pr-8 appearance-none cursor-pointer min-w-[160px]"
          >
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : paged.length === 0 ? (
        <EmptyState icon={Package} title="No products found" message={search || category ? "Try adjusting your filters" : "Products will appear here once added"} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paged.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -4 }}
              className="glass-card overflow-hidden group"
            >
              <div className="relative h-44 overflow-hidden bg-brand-50 dark:bg-slate-800">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-12 h-12 text-brand-300" />
                  </div>
                )}
                <span className="absolute top-3 right-3 badge bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm text-brand-600 dark:text-brand-300">
                  {product.warranty_months} mo warranty
                </span>
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">{product.name}</h3>
                    <p className="text-sm text-slate-400">{product.brand} · {product.model}</p>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => { setEditProduct(product); setShowForm(true); }} className="p-1.5 rounded-lg text-slate-400 hover:bg-brand-50 hover:text-brand-500 dark:hover:bg-slate-800">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteId(product.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-2">{product.category}</p>
                {product.description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">{product.description}</p>}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-ghost disabled:opacity-40">Previous</button>
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`w-9 h-9 rounded-lg font-medium transition-all ${page === i + 1 ? 'bg-brand-500 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              {i + 1}
            </button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-ghost disabled:opacity-40">Next</button>
        </div>
      )}

      {showForm && (
        <ProductForm
          product={editProduct}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchProducts(); }}
        />
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}

function ProductForm({ product, onClose, onSaved }: { product: Product | null; onClose: () => void; onSaved: () => void }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: product?.name ?? '',
    brand: product?.brand ?? '',
    model: product?.model ?? '',
    category: product?.category ?? 'Electronics',
    image_url: product?.image_url ?? '',
    description: product?.description ?? '',
    warranty_months: product?.warranty_months ?? 12,
    warranty_type: product?.warranty_type ?? 'standard',
    warranty_terms: product?.warranty_terms ?? '',
    coverage_details: product?.coverage_details ?? '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.brand || !form.model) { toast('Please fill required fields', 'warning'); return; }
    setSaving(true);
    const payload = { ...form, image_url: form.image_url || placeholderImages[Math.floor(Math.random() * placeholderImages.length)] };
    const { error } = product
      ? await supabase.from('products').update(payload).eq('id', product.id)
      : await supabase.from('products').insert(payload);
    setSaving(false);
    if (error) { toast('Failed to save product', 'error'); }
    else { toast(product ? 'Product updated' : 'Product created', 'success'); onSaved(); }
  };

  return (
    <Modal open onClose={onClose} title={product ? 'Edit Product' : 'Add Product'} maxWidth="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="glass-input" placeholder="Samsung 4K Smart TV" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Brand *</label>
            <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="glass-input" placeholder="Samsung" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Model *</label>
            <input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="glass-input" placeholder="QN55Q80T" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="glass-input appearance-none cursor-pointer">
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Image URL</label>
          <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="glass-input" placeholder="https://..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Description</label>
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="glass-input min-h-[80px] resize-none" placeholder="Product description..." />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Warranty Duration (months)</label>
            <input type="number" value={form.warranty_months} onChange={(e) => setForm({ ...form, warranty_months: parseInt(e.target.value) || 12 })} className="glass-input" min={1} max={120} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Warranty Type</label>
            <select value={form.warranty_type} onChange={(e) => setForm({ ...form, warranty_type: e.target.value as 'standard' | 'extended' })} className="glass-input appearance-none cursor-pointer">
              <option value="standard">Standard</option>
              <option value="extended">Extended</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Warranty Terms</label>
          <textarea value={form.warranty_terms} onChange={(e) => setForm({ ...form, warranty_terms: e.target.value })} className="glass-input min-h-[60px] resize-none" placeholder="Terms and conditions..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Coverage Details</label>
          <textarea value={form.coverage_details} onChange={(e) => setForm({ ...form, coverage_details: e.target.value })} className="glass-input min-h-[60px] resize-none" placeholder="What's covered..." />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? <PageLoader /> : null}
            {product ? 'Update' : 'Create'} Product
          </button>
        </div>
      </form>
    </Modal>
  );
}
