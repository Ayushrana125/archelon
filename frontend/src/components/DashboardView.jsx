import React, { useState, useEffect, useCallback } from 'react';
import { authHeaders } from '../services/auth_service';

const API_URL = import.meta.env.VITE_API_URL;
const TEAL = '#00C9B1';

// OpenAI text-embedding-3-small: $0.020 per 1M tokens
const COST_PER_TOKEN = 0.020 / 1_000_000;

const inputCls = "px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2a2a2a] text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#00C9B1]/40";

function StatCard({ label, value, sub, icon, wide }) {
  return (
    <div className={`relative bg-white dark:bg-[#2a2a2a] rounded-xl p-5 border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-gray-300 dark:hover:border-gray-600 transition-colors ${wide ? 'col-span-2 md:col-span-1' : ''}`}>
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

function CostCard({ childTokens }) {
  const cost = childTokens * COST_PER_TOKEN;
  const formatted = cost < 0.01 ? `$${cost.toFixed(5)}` : `$${cost.toFixed(4)}`;
  return (
    <div className="relative bg-white dark:bg-[#2a2a2a] rounded-xl p-5 border border-gray-200 dark:border-gray-700 overflow-hidden hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
      <div className="absolute top-0 left-0 w-1 h-full rounded-l-xl bg-red-400" />
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">Embedding Cost</span>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-red-400/10">
          <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
      <div className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{formatted}</div>
      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">{childTokens.toLocaleString()} tokens · $0.020 / 1M (text-embedding-3-small)</div>
    </div>
  );
}

function SkeletonCard() {
  return <div className="bg-white dark:bg-[#2a2a2a] rounded-xl p-5 border border-gray-200 dark:border-gray-700 animate-pulse h-24" />;
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
    <div className="h-[calc(100vh-57px)] p-6 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400 dark:text-gray-500">Platform-wide stats across all users and agents</p>
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
        <div className="flex flex-wrap items-center gap-2 p-3.5 rounded-xl bg-gray-50 dark:bg-[#252525] border border-gray-200 dark:border-gray-700">
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
            <button onClick={() => { setDateFrom(''); setDateTo(''); setUserId(''); setAgentId(''); }}
              className="ml-auto px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2a2a2a] transition-colors">
              Clear
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
            <div className="grid grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
            <SkeletonCard />
          </div>
        ) : stats && (
          <div className="space-y-4">

            {/* Row 1 — Platform overview */}
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">Platform</p>
              <div className="grid grid-cols-3 gap-4">
                <StatCard label="Users" value={stats.total_users}
                  icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                <StatCard label="Agents" value={stats.total_agents}
                  icon="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                <StatCard label="Documents" value={stats.total_documents}
                  icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </div>
            </div>

            {/* Row 2 — Chunks */}
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">Chunks</p>
              <div className="grid grid-cols-3 gap-4">
                <StatCard label="Parent Chunks" value={stats.total_parent_chunks} sub={`${stats.parent_tokens.toLocaleString()} tokens`}
                  icon="M4 6h16M4 10h16M4 14h10" />
                <StatCard label="Child Chunks" value={stats.total_child_chunks} sub={`${stats.child_tokens.toLocaleString()} tokens`}
                  icon="M4 6h16M4 10h16M4 14h6" />
                <StatCard label="Total Chunks" value={stats.total_parent_chunks + stats.total_child_chunks} sub={`${(stats.parent_tokens + stats.child_tokens).toLocaleString()} tokens`}
                  icon="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </div>
            </div>

            {/* Row 3 — Cost */}
            <div>
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">Cost</p>
              <div className="grid grid-cols-3 gap-4">
                <CostCard childTokens={stats.child_tokens} />
              </div>
            </div>

            {/* Tables */}
            <div className="grid grid-cols-2 gap-4">
              {/* Users table */}
              <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/60">
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Users</span>
                </div>
                <div className="overflow-y-auto max-h-48">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-[#252525] sticky top-0">
                      <tr>
                        <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 py-2.5">User</th>
                        <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 py-2.5">Username</th>
                        <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 py-2.5">Agents</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                      {(stats.users || []).map((u, i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-[#2f2f2f] transition-colors">
                          <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">{u.first_name} {u.last_name}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-400 dark:text-gray-500">@{u.username}</td>
                          <td className="px-4 py-2.5 text-sm font-medium" style={{ color: TEAL }}>{u.agent_count || 0}</td>
                        </tr>
                      ))}
                      {!stats.users?.length && (
                        <tr><td colSpan={3} className="px-4 py-6 text-sm text-gray-400 text-center">No users</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Agents table */}
              <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/60">
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Agents</span>
                </div>
                <div className="overflow-y-auto max-h-48">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-[#252525] sticky top-0">
                      <tr>
                        <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 py-2.5">Agent</th>
                        <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 py-2.5">Owner</th>
                        <th className="text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 py-2.5">Tokens</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                      {(stats.agents || []).map((a, i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-[#2f2f2f] transition-colors">
                          <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">{a.name}</td>
                          <td className="px-4 py-2.5 text-sm text-gray-400 dark:text-gray-500">{a.owner}</td>
                          <td className="px-4 py-2.5 text-sm font-medium" style={{ color: TEAL }}>{(a.token_count || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                      {!stats.agents?.length && (
                        <tr><td colSpan={2} className="px-4 py-6 text-sm text-gray-400 text-center">No agents</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardView;
