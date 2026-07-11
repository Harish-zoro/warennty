import { type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Wrench, Clock, Bell, QrCode, ArrowRight } from 'lucide-react';

export function AuthLayout({ children }: { children: ReactNode }) {
  const features = [
    { icon: ShieldCheck, title: 'Digital Warranty Cards', desc: 'Activate and manage warranties digitally' },
    { icon: Wrench, title: 'Service Tracking', desc: 'Real-time repair status with timelines' },
    { icon: QrCode, title: 'QR Code Registration', desc: 'Instant product registration via QR scan' },
    { icon: Clock, title: 'Warranty Reminders', desc: 'Never miss an expiry or service due date' },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-12 flex-col justify-between">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white/30 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-brand-300/30 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-brand-400/20 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 text-white">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold font-display">WarrantyHub</span>
          </div>
        </div>

        <div className="relative z-10 text-white">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold font-display leading-tight mb-4"
          >
            Service & Warranty<br />Management, Reimagined.
          </motion.h1>
          <p className="text-brand-100 text-lg max-w-md mb-10">
            Register products, track repairs, manage technicians, and transfer ownership — all in one elegant platform.
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-lg">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (i + 1) }}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10"
              >
                <f.icon className="w-6 h-6 text-brand-100 mb-2" />
                <h3 className="font-semibold text-white text-sm">{f.title}</h3>
                <p className="text-brand-200 text-xs mt-0.5">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-brand-200 text-sm flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Trusted by 10,000+ customers worldwide
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 bg-gradient-to-br from-brand-50 via-white to-brand-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
