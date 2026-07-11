import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Lock, Bell, Camera, Save, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { SectionHeader } from '../components/StatCard';

export function SettingsPage() {
  const { profile, user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profileForm, setProfileForm] = useState({
    full_name: profile?.full_name ?? '',
    phone: profile?.phone ?? '',
    avatar_url: profile?.avatar_url ?? '',
  });
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [notifSettings, setNotifSettings] = useState({
    warrantyExpiry: true,
    serviceUpdates: true,
    transferUpdates: true,
    marketing: false,
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.id) return;
    if (file.size > 5 * 1024 * 1024) { toast('Image must be under 5MB', 'warning'); return; }
    setUploadingAvatar(true);
    const fileExt = file.name.split('.').pop();
    const filePath = `${profile.id}/avatar.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
    if (uploadError) { toast('Failed to upload image', 'error'); setUploadingAvatar(false); return; }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const url = `${publicUrl}?t=${Date.now()}`;
    const { error: updateError } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id);
    if (updateError) { toast('Failed to update profile', 'error'); }
    else {
      setProfileForm((prev) => ({ ...prev, avatar_url: url }));
      await refreshProfile();
      toast('Profile photo updated', 'success');
    }
    setUploadingAvatar(false);
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    setSavingProfile(true);
    const { error } = await supabase.from('profiles').update({
      full_name: profileForm.full_name,
      phone: profileForm.phone,
      avatar_url: profileForm.avatar_url,
    }).eq('id', profile.id);
    if (error) { toast('Failed to update profile', 'error'); }
    else { toast('Profile updated', 'success'); refreshProfile(); }
    setSavingProfile(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.new !== passwordForm.confirm) { toast('Passwords do not match', 'error'); return; }
    if (passwordForm.new.length < 6) { toast('Password must be at least 6 characters', 'warning'); return; }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: passwordForm.new });
    if (error) { toast(error.message, 'error'); }
    else { toast('Password updated', 'success'); setPasswordForm({ current: '', new: '', confirm: '' }); }
    setSavingPassword(false);
  };

  return (
    <div>
      <SectionHeader title="Settings" subtitle="Manage your account and preferences" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2">
          <div className="glass-card p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                  {profileForm.avatar_url ? (
                    <img src={profileForm.avatar_url} alt={profileForm.full_name} className="w-full h-full object-cover" />
                  ) : (
                    profileForm.full_name?.charAt(0).toUpperCase() ?? 'U'
                  )}
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-white dark:bg-slate-800 shadow-lg flex items-center justify-center text-brand-500 hover:scale-110 transition-transform disabled:opacity-50"
                >
                  {uploadingAvatar ? (
                    <div className="w-3.5 h-3.5 border-2 border-brand-400/30 border-t-brand-500 rounded-full animate-spin" />
                  ) : (
                    <Camera className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">{profile?.full_name ?? 'User'}</h3>
                <p className="text-sm text-slate-400 capitalize">{profile?.role}</p>
              </div>
            </div>

            <form onSubmit={handleProfileSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} className="glass-input pl-11" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input value={user?.email ?? ''} disabled className="glass-input pl-11 opacity-60 cursor-not-allowed" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} className="glass-input pl-11" placeholder="+1 234 567 890" />
                </div>
              </div>
              <button type="submit" disabled={savingProfile} className="btn-primary">
                {savingProfile ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save className="w-5 h-5" /> Save Changes</>}
              </button>
            </form>
          </div>
        </motion.div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Role badge */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-950/40 flex items-center justify-center">
                <Shield className="w-5 h-5 text-brand-500" />
              </div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Account Role</h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              You are registered as a <span className="font-semibold text-brand-600 dark:text-brand-300 capitalize">{profile?.role}</span>. This determines what features you can access.
            </p>
          </motion.div>

          {/* Notifications */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center">
                <Bell className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Notifications</h3>
            </div>
            <div className="space-y-3">
              {[
                { key: 'warrantyExpiry', label: 'Warranty expiry alerts' },
                { key: 'serviceUpdates', label: 'Service request updates' },
                { key: 'transferUpdates', label: 'Ownership transfer updates' },
                { key: 'marketing', label: 'Product news & offers' },
              ].map((item) => (
                <label key={item.key} className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-slate-600 dark:text-slate-300">{item.label}</span>
                  <button
                    type="button"
                    onClick={() => setNotifSettings({ ...notifSettings, [item.key]: !notifSettings[item.key as keyof typeof notifSettings] })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${notifSettings[item.key as keyof typeof notifSettings] ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${notifSettings[item.key as keyof typeof notifSettings] ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </label>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Password change */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-3">
          <div className="glass-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/30 flex items-center justify-center">
                <Lock className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">Change Password</h3>
            </div>
            <form onSubmit={handlePasswordChange} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Current Password</label>
                <input type="password" value={passwordForm.current} onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })} className="glass-input" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">New Password</label>
                <input type="password" value={passwordForm.new} onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })} className="glass-input" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1.5">Confirm Password</label>
                <input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} className="glass-input" placeholder="••••••••" />
              </div>
              <div className="sm:col-span-3">
                <button type="submit" disabled={savingPassword} className="btn-secondary">
                  {savingPassword ? <div className="w-5 h-5 border-2 border-brand-400/30 border-t-brand-500 rounded-full animate-spin" /> : <><Lock className="w-4 h-4" /> Update Password</>}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
