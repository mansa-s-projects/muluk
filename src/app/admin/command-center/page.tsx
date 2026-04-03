'use client';
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type DashboardStats = {
  totalCreators: number;
  totalFans: number;
  activeUsers: number;
};

type ProfileRow = {
  role: string | null;
};

export default function AdminCommandCenter() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  async function loadDashboardData() {
    const { data } = await supabase.from('profiles').select('role');
    const profiles = (data ?? []) as ProfileRow[];
    const creators = profiles.filter((p) => p.role === 'creator');
    const fans = profiles.filter((p) => p.role === 'fan');

    setStats({
      totalCreators: creators.length,
      totalFans: fans.length,
      activeUsers: profiles.length,
    });
    setLoading(false);
  }

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
        CIPHER COMMAND CENTER
      </h1>
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
          <h3 className="text-gray-400 mb-2">Total Creators</h3>
          <p className="text-4xl font-bold text-yellow-400">{stats?.totalCreators || 0}</p>
        </div>
        <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
          <h3 className="text-gray-400 mb-2">Total Fans</h3>
          <p className="text-4xl font-bold text-yellow-400">{stats?.totalFans || 0}</p>
        </div>
        <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
          <h3 className="text-gray-400 mb-2">Active Users</h3>
          <p className="text-4xl font-bold text-yellow-400">{stats?.activeUsers || 0}</p>
        </div>
      </div>
      <div className="mt-8 bg-gray-900 p-6 rounded-lg border border-gray-800">
        <h2 className="text-2xl font-bold mb-4">🚀 Analytics Active!</h2>
        <p className="text-gray-400">PostHog is tracking all events. Check your PostHog dashboard for detailed analytics.</p>
      </div>
    </div>
  );
}
