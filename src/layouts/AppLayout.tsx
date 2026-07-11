import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Package, ShieldCheck, Wrench, ClipboardList, ArrowLeftRight,
  Bell, Settings, LogOut, Menu, X, Sun, Moon, Search, ShieldCheck as Logo,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { UserRole } from '../types';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'customer', 'technician'] },
  { to: '/app/products', label: 'Products', icon: Package, roles: ['admin', 'customer'] },
  { to: '/app/warranty', label: 'Warranty', icon: ShieldCheck, roles: ['admin', 'customer'] },
  { to: '/app/register', label: 'Register Product', icon: ClipboardList, roles: ['customer'] },
  { to: '/app/service', label: 'Service Requests', icon: Wrench, roles: ['admin', 'customer', 'technician'] },
  { to: '/app/technicians', label: 'Technicians', icon: Wrench, roles: ['admin'] },
  { to: '/app/transfer', label: 'Ownership Transfer', icon: ArrowLeftRight, roles: ['customer', 'admin'] },
  { to: '/app/settings', label: 'Settings', icon: Settings, roles: ['admin', 'customer', 'technician'] },
];

export function AppLayout() {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const role = profile?.role ?? 'customer';
  const items = navItems.filter((item) => item.roles.includes(role));

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50/40 via-white to-brand-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Navbar */}
      <header className="glass-nav sticky top-0 z-50 px-4 sm:px-6 h-16 flex items-center gap-4">
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden btn-ghost p-2">
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/30">
            <Logo className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold font-display text-slate-800 dark:text-white hidden sm:block">WarrantyHub</span>
        </div>

        {/* Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              placeholder="Search products, services, warranties..."
              className="w-full bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm border border-white/30 dark:border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400/40"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button onClick={toggleTheme} className="btn-ghost p-2" title="Toggle theme">
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>

          <div className="relative">
            <button onClick={() => setNotifOpen(!notifOpen)} className="btn-ghost p-2 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
            </button>
            <AnimatePresence>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 glass-card p-4 z-50"
                  >
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Notifications</h3>
                    <div className="space-y-2">
                      {[
                        { title: 'Warranty expiring soon', desc: 'Your Samsung TV warranty expires in 7 days', color: 'bg-amber-500' },
                        { title: 'Service request accepted', desc: 'Technician assigned to your request #SR-001', color: 'bg-blue-500' },
                        { title: 'Repair completed', desc: 'Your laptop repair is complete and ready for pickup', color: 'bg-emerald-500' },
                      ].map((n, i) => (
                        <div key={i} className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-white/40 dark:hover:bg-slate-800/40 transition-colors cursor-pointer">
                          <div className={`w-2 h-2 rounded-full ${n.color} mt-1.5 shrink-0`} />
                          <div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{n.title}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">{n.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-2 pl-2 ml-1 border-l border-slate-200/50 dark:border-slate-700/50">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-semibold text-sm overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile?.full_name} className="w-full h-full object-cover" />
              ) : (
                profile?.full_name?.charAt(0).toUpperCase() ?? 'U'
              )}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-tight">{profile?.full_name ?? 'User'}</p>
              <p className="text-xs text-slate-400 capitalize">{role}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar — desktop */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0 h-[calc(100vh-4rem)] sticky top-16 p-4">
          <nav className="flex-1 space-y-1">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/app'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/30'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/50'
                  }`
                }
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>
          <button onClick={handleSignOut} className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all">
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </aside>

        {/* Sidebar — mobile */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              <motion.aside
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed left-0 top-16 bottom-0 z-50 w-64 glass-nav p-4 lg:hidden overflow-y-auto"
              >
                <nav className="space-y-1">
                  {items.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/app'}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                          isActive
                            ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/30'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-slate-800/50'
                        }`
                      }
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </NavLink>
                  ))}
                  <button onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all">
                    <LogOut className="w-5 h-5" />
                    Logout
                  </button>
                </nav>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
