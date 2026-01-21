'use client';

import { Sidebar } from '@/components/layout/Sidebar';
import styles from './layout.module.css';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState, useRef } from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    fullName: '',
    avatarUrl: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [updating, setUpdating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const getProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, avatar_url, role')
          .eq('id', user.id)
          .single();
        
        if (profileData) {
          setProfile(profileData);
          setEditFormData(prev => ({
            ...prev,
            fullName: profileData.full_name || '',
            avatarUrl: profileData.avatar_url || '',
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          }));
          setPreviewUrl(profileData.avatar_url || '');
        } else {
          // Fallback if no profile record exists yet
          const fallbackName = user.email?.split('@')[0] || '';
          setProfile({ full_name: fallbackName });
          setEditFormData(prev => ({ ...prev, fullName: fallbackName }));
        }
      }
    };
    getProfile();
  }, [supabase]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      let finalAvatarUrl = editFormData.avatarUrl;

      // 1. Handle Avatar Upload
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}/${Math.random()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, avatarFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);
        
        finalAvatarUrl = publicUrl;
      }

      // 2. Handle Password Update (needs current password)
      if (editFormData.newPassword) {
        if (editFormData.newPassword !== editFormData.confirmPassword) {
          throw new Error('New passwords do not match');
        }
        if (!editFormData.currentPassword) {
          throw new Error('Current password is required to set a new password');
        }

        // Reauthenticate
        const { error: reauthError } = await supabase.auth.signInWithPassword({
          email: user.email!,
          password: editFormData.currentPassword,
        });

        if (reauthError) throw new Error('Current password incorrect');

        const { error: authError } = await supabase.auth.updateUser({
          password: editFormData.newPassword.trim()
        });
        if (authError) throw authError;
      }

      // 3. Update Profile Table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: editFormData.fullName,
          avatar_url: finalAvatarUrl
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Success
      setProfile({
        ...profile,
        full_name: editFormData.fullName,
        avatar_url: finalAvatarUrl
      });
      setIsEditProfileOpen(false);
      setEditFormData(prev => ({ 
        ...prev, 
        currentPassword: '', 
        newPassword: '', 
        confirmPassword: '' 
      }));
      setAvatarFile(null);
      alert('Profile updated successfully!');
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <>
      <div className={styles.layout}>
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden glass"
            style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} role={profile?.role} />
        </div>

        <main className={styles.main}>
          <header className={styles.header}>
            <div className="md:hidden" style={{ marginRight: '1rem' }}>
              {/* Simple Hamburger Icon */}
              <Button variant="ghost" onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden">
                ☰
              </Button>
            </div>
            <h2 style={{ fontWeight: 600 }}>Overview</h2>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div 
                style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginRight: '0.5rem', cursor: 'pointer', padding: '0.25rem 0.5rem', borderRadius: '4px', transition: 'background 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                onClick={() => setIsEditProfileOpen(true)}
                title="Edit Profile"
              >
                <span style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
                  Welcome, <strong style={{ color: 'var(--foreground)' }}>{profile?.full_name || 'User'}</strong>
                </span>
                <Avatar src={profile?.avatar_url} name={profile?.full_name} size={32} />
              </div>
              <div style={{ height: '20px', width: '1px', background: 'var(--border)' }}></div>
              <Button variant="ghost" onClick={handleLogout} style={{ fontSize: '0.875rem' }}>Logout</Button>
            </div>
          </header>
          <div className={styles.content}>
            {children}
          </div>
        </main>
      </div>

      <Modal isOpen={isEditProfileOpen} onClose={() => setIsEditProfileOpen(false)} title="Edit Profile">
        <form onSubmit={handleProfileUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '400px', maxWidth: '100%' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            <div style={{ position: 'relative' }}>
              <Avatar src={previewUrl} name={editFormData.fullName} size={80} />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{ 
                  position: 'absolute', 
                  bottom: 0, 
                  right: 0, 
                  background: 'var(--primary)', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '50%', 
                  width: '24px', 
                  height: '24px', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }}
              >
                ✎
              </button>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              style={{ display: 'none' }} 
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)' }}>Click the icon to upload a new photo</span>
          </div>

          <Input 
            label="Full Name" 
            value={editFormData.fullName} 
            onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
            required
          />
          
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '1rem' }}>Security & Password</label>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <Input 
                  type="password" 
                  label="Current Password" 
                  placeholder="Required for password changes"
                  value={editFormData.currentPassword} 
                  onChange={(e) => setEditFormData({ ...editFormData, currentPassword: e.target.value })}
              />
              <Input 
                  type="password" 
                  label="New Password" 
                  placeholder="Min 6 characters"
                  value={editFormData.newPassword} 
                  onChange={(e) => setEditFormData({ ...editFormData, newPassword: e.target.value })}
              />
              <Input 
                  type="password" 
                  label="Confirm New Password" 
                  placeholder="Repeat new password"
                  value={editFormData.confirmPassword} 
                  onChange={(e) => setEditFormData({ ...editFormData, confirmPassword: e.target.value })}
              />
            </div>
          </div>
          <Button type="submit" fullWidth disabled={updating}>
            {updating ? 'Saving Changes...' : 'Save Profile'}
          </Button>
        </form>
      </Modal>
    </>
  );
}
