'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    // Use Supabase's built-in auth state change listener
    // This automatically handles the OAuth callback and code exchange
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
            setStatus('success');
        // Clear URL params
          window.history.replaceState({}, '', '/auth/callback');
            // Redirect to calendar after sign-in
            setTimeout(() => router.push('/calendar'), 1000);
      } else if (event === 'SIGNED_OUT') {
          setStatus('error');
          setTimeout(() => router.push('/dashboard?error=no_session'), 2000);
      }
    });

    // Also try to get session immediately (Supabase auto-handles URL code)
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('Auth error:', error);
        setStatus('error');
        setTimeout(() => router.push('/dashboard?error=auth_failed'), 2000);
      } else if (session) {
        setStatus('success');
        window.history.replaceState({}, '', '/auth/callback');
        // Redirect to calendar after sign-in
        setTimeout(() => router.push('/calendar'), 1000);
      }
      // If no session, wait for onAuthStateChange to fire
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <div className="bg-white min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        {status === 'loading' && (
          <>
            <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-600 rounded-full animate-spin mx-auto" />
            <p className="text-amber-900/70">Completing sign in...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-white text-sm">check</span>
            </div>
            <p className="text-amber-900/70">Sign in successful! Redirecting...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-white text-sm">close</span>
            </div>
            <p className="text-amber-900/70">Sign in failed. Redirecting to login...</p>
          </>
        )}
      </div>
    </div>
  );
}
