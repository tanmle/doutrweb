'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { EditProfileModal } from '@/components/layout/EditProfileModal';
import { Sidebar } from '@/components/layout/Sidebar';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/ToastProvider';
import { createClient } from '@/utils/supabase/client';
import styles from './layout.module.css';

type Profile = {
  full_name?: string | null;
  avatar_url?: string | null;
  role?: string | null;
};

type EditFormData = {
  fullName: string;
  avatarUrl: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const toast = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<EditFormData>({
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
  const supabase = useMemo(() => createClient(), []);

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

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
    }
  }, []);

  const handleEditFormChange = useCallback((field: keyof EditFormData, value: string) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleFileTrigger = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  useEffect(() => {
    if (!avatarFile) return;
    const objectUrl = URL.createObjectURL(avatarFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.replace('/login');
  }, [router, supabase]);

  const handleProfileUpdate = useCallback(async (e: React.FormEvent) => {
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
      setProfile((prev) => ({
        ...(prev ?? {}),
        full_name: editFormData.fullName,
        avatar_url: finalAvatarUrl
      }));
      setPreviewUrl(finalAvatarUrl);
      setIsEditProfileOpen(false);
      setEditFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
      setAvatarFile(null);
      toast.success('Profile updated successfully!');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error('Error: ' + message);
    } finally {
      setUpdating(false);
    }
  }, [avatarFile, editFormData, supabase]);

  return (
    <>
      <div className={styles.layout}>
        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div
            className={`${styles.mobileOverlay} glass`}
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} role={profile?.role ?? undefined} />
        </div>

        <main className={styles.main}>
          <header className={styles.header}>
            <div className={styles.mobileMenu}>
              <Button
                variant="ghost"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className={styles.mobileMenuButton}
                aria-label="Open navigation menu"
              >
                ☰
              </Button>
            </div>
            <h2 className={styles.headerTitle}>Overview</h2>
            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.profileButton}
                onClick={() => setIsEditProfileOpen(true)}
                title="Edit Profile"
              >
                <span className={styles.profileGreeting}>
                  Welcome, <strong className={styles.profileName}>{profile?.full_name || 'User'}</strong>
                </span>
                <Avatar src={profile?.avatar_url} name={profile?.full_name} size={32} />
              </button>
              <div className={styles.headerDivider} />
              <Button variant="ghost" onClick={handleLogout} className={styles.logoutButton}>Logout</Button>
            </div>
          </header>
          <div className={styles.content}>
            {children}
          </div>
        </main>
      </div>

      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        onSubmit={handleProfileUpdate}
        updating={updating}
        formData={editFormData}
        previewUrl={previewUrl}
        fileInputRef={fileInputRef}
        onFileTrigger={handleFileTrigger}
        onFileChange={handleFileChange}
        onFieldChange={handleEditFormChange}
      />
    </>
  );
}
