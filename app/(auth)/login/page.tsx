'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import styles from './page.module.css';
import { createClient } from '@/utils/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh(); // Ensure server session is updated
    }
  }, [email, password, router, supabase]);

  const handleSignUp = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: email.split('@')[0], // Simple default name
        },
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setError('Check email for confirmation link!');
    }
    setLoading(false);
  }, [email, password, supabase]);

  return (
    <div className={styles.container}>
      <Card className={styles.authCard}>
        <div className={styles.header}>
          <div className={styles.logoWrapper}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 2L2 9L16 16L30 9L16 2Z" fill="url(#logo-gradient)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              <path d="M2 23L16 30L30 23V9L16 16L2 9V23Z" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <defs>
                <linearGradient id="logo-gradient" x1="2" y1="2" x2="30" y2="30" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#fff" />
                  <stop offset="1" stopColor="#94a3b8" />
                </linearGradient>
              </defs>
            </svg>
            <div className={styles.logoGlow} />
          </div>
          <h1 className={styles.title}>
            <span className={styles.titleThin}>Shop</span> Manager
          </h1>
          <p className={styles.subtitle}>Enter your credentials to access the dashboard</p>
        </div>

        {error && (
          <div className={styles.errorBanner}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className={styles.form}>
          <Input
            label="Email Address"
            placeholder="seller@gmail.com"
            type="email"
            name="email"
            autoComplete="email"
            spellCheck={false}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={styles.inputField}
          />
          <Input
            label="Password"
            placeholder="••••••••"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={styles.inputField}
          />

          <div style={{ marginTop: '1rem' }}>
            <Button type="submit" disabled={loading} fullWidth className={styles.submitButton}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  Processing…
                </span>
              ) : 'Sign In'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
