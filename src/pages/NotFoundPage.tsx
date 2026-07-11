import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ShieldCheck } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-brand-50 via-white to-brand-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold font-display text-slate-800 dark:text-white">WarrantyHub</span>
        </div>

        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 10 }}
          className="text-8xl font-bold font-display text-gradient mb-4"
        >
          404
        </motion.div>
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Page Not Found</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/app" className="btn-primary">
          <Home className="w-5 h-5" /> Back to Dashboard
        </Link>
      </motion.div>
    </div>
  );
}
