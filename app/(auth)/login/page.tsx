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
        <h1 className={styles.title}>Shop Manager</h1>
        <p className={styles.subtitle}>Sign in to your account</p>

        {error && (
          <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171', borderRadius: 'var(--radius-sm)', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className={styles.form}>
          <Input
            label="Email Address"
            placeholder="seller@gmail.com"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            label="Password"
            placeholder="••••••••"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Button type="submit" disabled={loading}>
              {loading ? 'Processing...' : 'Sign In'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
