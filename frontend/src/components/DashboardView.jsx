import React, { useState, useEffect, useCallback } from 'react';
import { authHeaders } from '../services/auth_service';

const API_URL = import.meta.env.VITE_API_URL;
const TEAL = '#00C9B1';

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white dark:bg-[#2a2a2a] rounded-xl p-5 border border-gray-200 dark:border-gray-700">
      <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{value ?? '—'}</div>
      {sub && <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

function DashboardView() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo]     = useState('');
  const [userId, setUserId]     = useState('');
  const [agentId, setAgentId]   = useState('');

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo)   params.set('date_to',   dateTo);
      if (userId)   params.set('user_id',   userId);
      if (agentId)  params.set('agent_id',  agentId);
      const res = await fetch(`${API_URL}/api/dashboard/stats?${params}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load stats');
      setStats(await res.json());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, userId, agentId]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const filteredAgents = stats?.agents?.filter(a => !userId || a.user_id === userId) ?? [];

  return (
    <div className="min-h-[calc(100vh-57px)] p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto">

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2a2a2a] text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#00C9B1]/40" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-400">To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2a2a2a] text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#00C9B1]/40" />
          </div>
          <select value={userId} onChange={e => { setUserId(e.target.value); setAgentId(''); }}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2a2a2a] text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#00C9B1]/40">
            <option value="">All users</option>
            {stats?.users?.map(u => (
              <option key={u.id} value={u.id}>{u.first_name} {u.last_name} (@{u.username})</option>
            ))}
          </select>
          <select value={agentId} onChange={e => setAgentId(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2a2a2a] text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#00C9B1]/40">
            <option value="">All agents</option>
            {filteredAgents.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          {(dateFrom || dateTo || userId || agentId) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); setUserId(''); setAgentId(''); }}
              className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700 transition-colors">
              Clear
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-400 mb-6">{error}</p>}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-[#2a2a2a] rounded-xl p-5 border border-gray-200 dark:border-gray-700 animate-pulse h-24" />
            ))}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard label="Total Users"         value={stats.total_users} />
            <StatCard label="Total Agents"        value={stats.total_agents} />
            <StatCard label="Total Documents"     value={stats.total_documents} />
            <StatCard label="Parent Chunks"       value={stats.total_parent_chunks} sub={`${stats.parent_tokens.toLocaleString()} tokens`} />
            <StatCard label="Child Chunks"        value={stats.total_child_chunks}  sub={`${stats.child_tokens.toLocaleString()} tokens`} />
            <StatCard label="Total Chunks"        value={stats.total_parent_chunks + stats.total_child_chunks} sub={`${(stats.parent_tokens + stats.child_tokens).toLocaleString()} tokens total`} />
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardView;
