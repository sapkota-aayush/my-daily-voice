'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/lib/supabase';
import { showError } from '@/app/components/Notification';
import Link from 'next/link';

interface MetricsData {
  emotionalDirection: {
    title: string;
    reflection: string;
    overallDirection?: string;
  };
  energyFocus: {
    title: string;
    reflection: string;
    optionalInsight?: string;
  };
  journalingHabit: {
    title: string;
    reflection: string;
    optionalEncouragement?: string;
  };
  recurringThemes: {
    title: string;
    reflection: string;
    themes?: string[];
  };
}

export default function MetricsPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [weekStart, setWeekStart] = useState<string | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
        }
      } catch (error) {
        router.push('/login');
      }
    }
    checkAuth();
  }, [router]);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true);
        setError(null);

        // Get authenticated user ID from Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const response = await fetch(`/api/metrics?userId=${user.id}`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Failed to fetch metrics' }));
          throw new Error(errorData.error || 'Failed to fetch metrics');
        }

        const data = await response.json();
        setMetrics(data);
        setIsCached(data.cached || false);
        setWeekStart(data.weekStart || null);
      } catch (err: any) {
        setError(err.message || 'Failed to load metrics');
        showError(err.message || 'Failed to load metrics');
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, [router]);


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white via-amber-50/50 to-yellow-50/40"></div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center justify-center min-h-[70vh]">
            <div className="text-center">
              <div className="w-20 h-20 border-4 border-amber-300/30 border-t-amber-600 rounded-full animate-spin mx-auto mb-6 shadow-lg"></div>
              <p className="text-amber-900 font-semibold text-xl mb-2">Reflecting on your journal entries...</p>
              <p className="text-amber-700 text-sm">Taking a moment to understand what your past days say about your life right now</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white via-amber-50/50 to-yellow-50/40"></div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="mb-8">
            <Link href="/dashboard" className="inline-flex items-center gap-2 text-amber-700 hover:text-amber-900 transition-all duration-300 group mb-8">
              <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
              <span className="font-medium">Back to Dashboard</span>
            </Link>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-amber-100/50 p-12 text-center border border-amber-200/60">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl text-red-600">error</span>
            </div>
            <p className="text-amber-900 font-bold text-xl mb-2">{error || 'Failed to load metrics'}</p>
            <p className="text-amber-700 text-sm">Please try again later</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Background decorations */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white via-amber-50/50 to-yellow-50/40"></div>
        <div className="absolute -top-[10%] -left-[10%] w-[60vw] h-[60vw] bg-amber-200/30 rounded-full mix-blend-multiply filter blur-[90px] opacity-60 animate-blob"></div>
        <div className="absolute top-[15%] -right-[15%] w-[55vw] h-[55vw] bg-orange-200/30 rounded-full mix-blend-multiply filter blur-[90px] opacity-60 animate-blob" style={{ animationDelay: '2s' }}></div>
        <div className="absolute -bottom-[20%] left-[20%] w-[60vw] h-[60vw] bg-yellow-100/40 rounded-full mix-blend-multiply filter blur-[100px] opacity-50 animate-blob" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-amber-700 hover:text-amber-900 transition-all duration-300 group mb-8">
            <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
            <span className="font-medium">Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-xl shadow-amber-300/50 group-hover:scale-105 transition-transform duration-300">
              <span className="material-symbols-outlined text-4xl text-white">insights</span>
            </div>
            <div>
              <h1 className="text-5xl md:text-6xl font-bold text-amber-900 mb-3 font-serif">Your Reflections</h1>
              <p className="text-xl text-amber-700/80 font-serif">What your past days say about your life right now</p>
              {weekStart && (
                <p className="text-sm text-amber-600/70 mt-2">
                  Week of {new Date(weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {isCached && <span className="ml-2 px-2 py-0.5 bg-amber-100/60 rounded-full text-xs">Cached</span>}
                </p>
              )}
            </div>
          </div>
          
          {/* Refresh button */}
          <div className="flex justify-end mb-4">
            <button
              onClick={async () => {
                setLoading(true);
                setError(null);
                try {
                  const { data: { user } } = await supabase.auth.getUser();
                  if (!user) {
                    router.push('/login');
                    return;
                  }
                  const response = await fetch(`/api/metrics?userId=${user.id}&refresh=true`);
                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Failed to refresh metrics' }));
                    throw new Error(errorData.error || 'Failed to refresh metrics');
                  }
                  const data = await response.json();
                  setMetrics(data);
                  setIsCached(data.cached || false);
                  setWeekStart(data.weekStart || null);
                } catch (err: any) {
                  setError(err.message || 'Failed to refresh metrics');
                  showError(err.message || 'Failed to refresh metrics');
                } finally {
                  setLoading(false);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100/80 hover:bg-amber-200/80 text-amber-800 font-medium transition-all duration-300 border border-amber-200/60 hover:border-amber-300"
            >
              <span className="material-symbols-outlined text-lg">refresh</span>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Reflection Blocks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12">
          {/* Emotional Direction */}
          <div className="group relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-amber-100/50 p-12 lg:p-14 border border-amber-200/60 hover:shadow-2xl hover:shadow-amber-200/70 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-50/30 via-transparent to-orange-50/20 pointer-events-none"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-5 mb-8">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md">
                  <span className="material-symbols-outlined text-4xl text-amber-600">mood</span>
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold text-amber-900">{metrics.emotionalDirection.title}</h2>
              </div>
              <div className="space-y-6">
                <p className="text-xl lg:text-2xl text-amber-900 leading-loose font-serif">{metrics.emotionalDirection.reflection}</p>
                {metrics.emotionalDirection.overallDirection && (
                  <div className="pt-6 border-t-2 border-amber-200/50">
                    <p className="text-lg lg:text-xl font-semibold text-amber-700">{metrics.emotionalDirection.overallDirection}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Where Your Energy Went */}
          <div className="group relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-amber-100/50 p-12 lg:p-14 border border-amber-200/60 hover:shadow-2xl hover:shadow-amber-200/70 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-indigo-50/20 pointer-events-none"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-5 mb-8">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md">
                  <span className="material-symbols-outlined text-4xl text-blue-600">psychology</span>
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold text-amber-900">{metrics.energyFocus.title}</h2>
              </div>
              <div className="space-y-6">
                <p className="text-xl lg:text-2xl text-amber-900 leading-loose font-serif">{metrics.energyFocus.reflection}</p>
                {metrics.energyFocus.optionalInsight && (
                  <div className="pt-6 border-t-2 border-amber-200/50">
                    <p className="text-lg lg:text-xl font-semibold text-amber-700">{metrics.energyFocus.optionalInsight}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Your Journaling Habit */}
          <div className="group relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-amber-100/50 p-12 lg:p-14 border border-amber-200/60 hover:shadow-2xl hover:shadow-amber-200/70 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/30 via-transparent to-teal-50/20 pointer-events-none"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-5 mb-8">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md">
                  <span className="material-symbols-outlined text-4xl text-emerald-600">calendar_today</span>
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold text-amber-900">{metrics.journalingHabit.title}</h2>
              </div>
              <div className="space-y-6">
                <p className="text-xl lg:text-2xl text-amber-900 leading-loose font-serif">{metrics.journalingHabit.reflection}</p>
                {metrics.journalingHabit.optionalEncouragement && (
                  <div className="pt-6 border-t-2 border-amber-200/50">
                    <p className="text-lg lg:text-xl font-semibold text-amber-700">{metrics.journalingHabit.optionalEncouragement}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* What Keeps Showing Up */}
          <div className="group relative bg-white/90 backdrop-blur-xl rounded-3xl shadow-xl shadow-amber-100/50 p-12 lg:p-14 border border-amber-200/60 hover:shadow-2xl hover:shadow-amber-200/70 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50/30 via-transparent to-pink-50/20 pointer-events-none"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-5 mb-8">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-md">
                  <span className="material-symbols-outlined text-4xl text-purple-600">auto_awesome</span>
                </div>
                <h2 className="text-3xl lg:text-4xl font-bold text-amber-900">{metrics.recurringThemes.title}</h2>
              </div>
              <div className="space-y-6">
                <p className="text-xl lg:text-2xl text-amber-900 leading-loose font-serif">{metrics.recurringThemes.reflection}</p>
                {metrics.recurringThemes.themes && metrics.recurringThemes.themes.length > 0 && (
                  <div className="pt-6 border-t-2 border-amber-200/50">
                    <ul className="space-y-4">
                      {metrics.recurringThemes.themes.map((theme, idx) => (
                        <li key={idx} className="flex items-center gap-3 text-lg lg:text-xl text-amber-800">
                          <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0"></span>
                          <span className="capitalize font-medium">{theme}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

