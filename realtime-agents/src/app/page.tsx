'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Always redirect to dashboard - it will show sign-in option if not authenticated
    router.replace('/dashboard');
  }, [router]);

  // Show loading while redirecting
  return (
    <div className="bg-white min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-600 rounded-full animate-spin" />
    </div>
  );
}
