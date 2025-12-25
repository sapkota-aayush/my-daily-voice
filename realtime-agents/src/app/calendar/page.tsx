'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar } from '@/app/components/Calendar';
import { supabase, type DailyReflection } from '@/app/lib/supabase';

export default function CalendarPage() {
  const router = useRouter();
  const [reflections, setReflections] = useState<DailyReflection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  // Check authentication
  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }
        setCheckingOnboarding(false);
      } catch (error) {
        console.error('Error checking auth:', error);
        router.push('/login');
      }
    }
    checkAuth();
  }, [router]);

  useEffect(() => {
    async function fetchReflections() {
      try {
        // Get authenticated user ID
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        const userId = user.id;

        const { data, error } = await supabase
          .from('daily_reflections')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .order('date', { ascending: false });
        
        if (error) {
          console.error('Supabase error:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
          throw error;
        }
        
        setReflections(data || []);
      } catch (err: any) {
        console.error('Error fetching reflections:', {
          error: err,
          message: err?.message || 'Unknown error',
          stack: err?.stack,
        });
        // Set empty array on error so app doesn't break
        setReflections([]);
      } finally {
        setIsLoading(false);
      }
    }

    if (!checkingOnboarding) {
      fetchReflections();
    }
  }, [checkingOnboarding]);

  const datesWithEntries = useMemo(() => {
    const dates = new Set<string>();
    reflections.forEach(r => {
      if (r.reflection_summary && r.reflection_summary.trim().length > 0) {
        dates.add(r.date);
      }
    });
    return dates;
  }, [reflections]);

  const handleDateSelect = (_date: Date, dateString: string) => {
    router.push(`/day/${dateString}`);
  };

  if (checkingOnboarding || isLoading) {
    return (
      <div className="bg-white min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-white text-amber-900/80 font-sans antialiased selection:bg-amber-200 selection:text-amber-900 overflow-x-hidden min-h-screen flex flex-col">
      {/* Animated Background Blobs - matching dashboard */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white via-amber-50/50 to-yellow-50/40"></div>
        <div className="absolute top-0 left-0 w-full h-full aurora-bg opacity-100"></div>
        <div className="absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] bg-amber-200/70 rounded-full mix-blend-multiply filter blur-[90px] opacity-80 animate-blob"></div>
        <div className="absolute top-[15%] -right-[15%] w-[55vw] h-[55vw] bg-yellow-200/70 rounded-full mix-blend-multiply filter blur-[90px] opacity-80 animate-blob" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[60vw] h-[60vw] bg-orange-100/60 rounded-full mix-blend-multiply filter blur-[100px] opacity-70 animate-blob" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Header */}
      <nav className="w-full py-4 px-6 md:px-12 flex justify-between items-center z-50 relative">
        {/* Bright overlay for navbar */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-amber-50/20 to-transparent pointer-events-none"></div>
        <Link href="/dashboard" className="flex items-center gap-2 group cursor-pointer relative z-10">
          <span className="material-symbols-outlined text-3xl text-amber-600 group-hover:text-amber-800 transition-colors duration-500">spa</span>
          <span className="font-serif italic text-2xl font-medium tracking-tight text-amber-900/90">Muse</span>
        </Link>
        <div className="flex items-center gap-4 relative z-10">
          <Link
            href="/metrics"
            className="group relative px-6 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium transition-all duration-300 shadow-lg shadow-amber-200/50 hover:shadow-xl hover:shadow-amber-300/60 hover:-translate-y-0.5 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg group-hover:scale-110 transition-transform">insights</span>
            <span>Metrics</span>
          </Link>
          <button 
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2.5 rounded-full border border-amber-200/60 hover:border-amber-300 hover:bg-amber-50/80 text-amber-800/90 hover:text-amber-900 transition-all duration-300 backdrop-blur-sm bg-white/60"
          >
            Dashboard
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-6 md:px-12 pt-12 pb-48 flex flex-col gap-12 relative">
        {/* Title Section */}
        <div className="text-center relative z-10">
          {/* Decorative badge */}
          <div className="inline-flex items-center gap-2.5 py-1.5 px-4 rounded-full border border-amber-300/70 bg-gradient-to-r from-amber-50 to-orange-50 backdrop-blur-md shadow-sm mb-6 hover:from-amber-100 hover:to-orange-100 transition-all duration-500 group cursor-default relative overflow-hidden">
            <span className="absolute inset-0 animate-shimmer"></span>
            <span className="relative z-10 w-2 h-2 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 group-hover:from-amber-600 group-hover:to-orange-600 transition-colors animate-dot-pulse"></span>
            <span className="relative z-10 text-xs font-bold tracking-widest uppercase text-amber-800 group-hover:text-orange-900 transition-colors">
              JOURNAL CALENDAR
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-[6rem] font-serif leading-[0.95] text-balance text-amber-900/90 tracking-tight drop-shadow-sm mb-4">
            Your Journal
          </h1>
          <p className="text-lg md:text-xl text-amber-900/75 max-w-xl mx-auto leading-relaxed font-serif font-normal">
            Reflect on your journey, one day at a time
          </p>
        </div>

        {/* Calendar Container with decorative elements */}
        <div className="flex-1 flex items-center justify-center relative">
          {/* Floating decorative elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full bg-amber-300/30 animate-float-slow"
                style={{
                  left: `${10 + Math.random() * 80}%`,
                  top: `${10 + Math.random() * 80}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration: `${8 + Math.random() * 4}s`,
                }}
              />
            ))}
          </div>

          {/* Gentle light rays */}
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute top-0 left-[15%] w-px h-full bg-gradient-to-b from-transparent via-amber-200/30 to-transparent transform rotate-12"></div>
            <div className="absolute top-0 right-[25%] w-px h-full bg-gradient-to-b from-transparent via-orange-200/20 to-transparent transform -rotate-12"></div>
          </div>

          <div className="w-full max-w-3xl relative z-10">
            {/* Decorative wrapper */}
            <div className="relative">
              {/* Corner decorations */}
              <div className="absolute -top-2 -left-2 w-12 h-12 border-t-2 border-l-2 border-amber-200/40 rounded-tl-lg"></div>
              <div className="absolute -top-2 -right-2 w-12 h-12 border-t-2 border-r-2 border-amber-200/40 rounded-tr-lg"></div>
              <div className="absolute -bottom-2 -left-2 w-12 h-12 border-b-2 border-l-2 border-amber-200/40 rounded-bl-lg"></div>
              <div className="absolute -bottom-2 -right-2 w-12 h-12 border-b-2 border-r-2 border-amber-200/40 rounded-br-lg"></div>

              {/* Calendar Card */}
              <div className="glass-panel rounded-3xl p-6 md:p-10 shadow-2xl shadow-amber-200/30 border border-amber-100/50 bg-white/95 backdrop-blur-xl relative overflow-hidden">
                {/* Subtle paper texture */}
                <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(circle_at_1px_1px,_rgba(0,0,0,0.1)_1px,_transparent_0)] bg-[length:20px_20px] pointer-events-none"></div>
                
                {/* Inner glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-50/20 via-transparent to-orange-50/20 pointer-events-none rounded-3xl"></div>
                
                <div className="relative z-10">
              <Calendar
                datesWithEntries={datesWithEntries}
                onDateSelect={handleDateSelect}
              />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer hint with decorative elements */}
        <div className="text-center pb-8 relative z-10">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/60 backdrop-blur-sm border border-amber-200/50 shadow-sm">
            <span className="material-symbols-outlined text-amber-600 text-xl">touch_app</span>
          <p className="text-lg text-amber-800/75 font-serif font-normal">
            Tap a date to view or create an entry
          </p>
          </div>
        </div>
      </main>
    </div>
  );
}
