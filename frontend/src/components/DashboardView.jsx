import React, { useState, useEffect, useCallback } from 'react';
import { authHeaders } from '../services/auth_service';

const API_URL = import.meta.env.VITE_API_URL;
const TEAL = '#00C9B1';

const CARDS = [
  {
    key: 'users',
    label: 'Users',
    value: s => s.total_users,
    sub: null,
    icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0',
  },
  {
    key: 'agents',
    label: 'Agents',
    value: s => s.total_agents,
    sub: null,
    icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  },
  {
    key: 'documents',
    label: 'Documents',
    value: s => s.total_documents,
    sub: null,
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
  {
    key: 'parent_chunks',
    label: 'Parent Chunks',
    value: s => s.total_parent_chunks,
    sub: s => `${s.parent_tokens.toLocaleString()} tokens`,
    icon: 'M4 6h16M4 10h16M4 14h10',
  },
  {
    key: 'child_chunks',
    label: 'Child Chunks',
    value: s => s.total_child_chunks,
    sub: s => `${s.child_tokens.toLocaleString()} tokens`,
    icon: 'M4 6h16M4 10h16M4 14h6',
  },
  {
    key: 'total_chunks',
    label: 'Total Chunks',
    value: s => s.total_parent_chunks + s.total_child_chunks,
    sub: s => `${(s.parent_tokens + s.child_tokens).toLocaleString()} tokens total`,
    icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
  },
];

function StatCard({ label, value, sub, icon }) {
  return (
    <div className="relative bg-white dark:bg-[#2a2a2a] rounded-xl p-5 border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
      <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl" style={{ background: TEAL }} />
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">{label}</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${TEAL}18` }}>
          <svg className="w-3.5 h-3.5" style={{ color: TEAL }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
          </svg>
        </div>
      </div>
      <div className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{value ?? '—'}</div>
      {sub && <div className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">{sub}</div>}
    </div>
  );
}

const inputCls = "px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2a2a2a] text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#00C9B1]/40";

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
      const res = await fetch(`${API_URL}/api/dashboard/stats?${params}`, { headers: authHeaders() });
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
  const hasFilters = dateFrom || dateTo || userId || agentId;

  return (
    <div className="min-h-[calc(100vh-57px)] p-8 overflow-y-auto">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-1">Dashboard</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500">Platform-wide stats across all users and agents</p>
          </div>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600 transition-colors disabled:opacity-40"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-8 p-4 rounded-xl bg-gray-50 dark:bg-[#252525] border border-gray-200 dark:border-gray-700">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider mr-1">Filter</span>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-400">From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputCls} />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-gray-400">To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputCls} />
          </div>
          <select value={userId} onChange={e => { setUserId(e.target.value); setAgentId(''); }} className={inputCls}>
            <option value="">All users</option>
            {stats?.users?.map(u => (
              <option key={u.id} value={u.id}>{u.first_name} {u.last_name} (@{u.username})</option>
            ))}
          </select>
          <select value={agentId} onChange={e => setAgentId(e.target.value)} className={inputCls}>
            <option value="">All agents</option>
            {filteredAgents.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          {hasFilters && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setUserId(''); setAgentId(''); }}
              className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2a2a2a] transition-colors ml-auto"
            >
              Clear filters
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-400 mb-6">{error}</p>}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-[#2a2a2a] rounded-xl p-5 border border-gray-200 dark:border-gray-700 animate-pulse h-28" />
            ))}
          </div>
        ) : stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {CARDS.map(card => (
              <StatCard
                key={card.key}
                label={card.label}
                value={card.value(stats)}
                sub={card.sub ? card.sub(stats) : null}
                icon={card.icon}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardView;
