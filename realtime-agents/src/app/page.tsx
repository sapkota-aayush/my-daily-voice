'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard (it will handle auth checks)
    async function redirectToDashboard() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    }
    redirectToDashboard();
  }, [router]);

  // Show loading while redirecting
  return (
    <div className="bg-white min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-600 rounded-full animate-spin" />
    </div>
  );
}
