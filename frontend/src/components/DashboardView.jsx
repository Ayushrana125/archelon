import React, { useState, useEffect, useCallback } from 'react';
import { authHeaders } from '../services/auth_service';

const API_URL = import.meta.env.VITE_API_URL;
const TEAL = '#00C9B1';
const COST_PER_TOKEN = 0.020 / 1_000_000;

const inputCls = "px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2a2a2a] text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#00C9B1]/40";
const thCls = "text-left text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider px-4 py-2.5";

function StatCard({ label, value, sub, icon }) {
  return (
    <div className="relative bg-white dark:bg-[#2a2a2a] rounded-xl p-5 border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
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
    <div className="relative bg-white dark:bg-[#2a2a2a] rounded-xl p-5 border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
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
  const [allStats, setAllStats] = useState(null);       // unfiltered — for tables
  const [filteredStats, setFilteredStats] = useState(null); // filtered — for cards
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [error, setError] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedAgentId, setSelectedAgentId] = useState(null);

  const fetchStats = useCallback(async (params = {}) => {
    const p = new URLSearchParams();
    if (dateFrom)           p.set('date_from', dateFrom);
    if (dateTo)             p.set('date_to', dateTo);
    if (params.user_id)     p.set('user_id', params.user_id);
    if (params.agent_id)    p.set('agent_id', params.agent_id);
    const res = await fetch(`${API_URL}/api/dashboard/stats?${p}`, { headers: authHeaders() });
    if (!res.ok) throw new Error('Failed to load stats');
    return res.json();
  }, [dateFrom, dateTo]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError('');
    setSelectedUserId(null);
    setSelectedAgentId(null);
    try {
      const data = await fetchStats();
      setAllStats(data);
      setFilteredStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchStats]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const applyFilter = useCallback(async ({ user_id, agent_id }) => {
    setFiltering(true);
    try {
      const data = await fetchStats({ user_id, agent_id });
      setFilteredStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setFiltering(false);
    }
  }, [fetchStats]);

  const handleUserClick = (userId) => {
    if (selectedUserId === userId) {
      setSelectedUserId(null);
      setSelectedAgentId(null);
      setFilteredStats(allStats);
    } else {
      setSelectedUserId(userId);
      setSelectedAgentId(null);
      applyFilter({ user_id: userId });
    }
  };

  const handleAgentClick = (agentId) => {
    if (selectedAgentId === agentId) {
      setSelectedAgentId(null);
      setSelectedUserId(null);
      setFilteredStats(allStats);
    } else {
      setSelectedAgentId(agentId);
      setSelectedUserId(null);
      applyFilter({ agent_id: agentId });
    }
  };

  const clearSelection = () => {
    setSelectedUserId(null);
    setSelectedAgentId(null);
    setFilteredStats(allStats);
  };

  const isFiltered = selectedUserId || selectedAgentId;
  const hasDateFilters = dateFrom || dateTo;
  const d = filteredStats;
  const visibleAgents = selectedUserId
    ? (allStats?.agents || []).filter(a => a.user_id === selectedUserId)
    : (allStats?.agents || []);

  return (
    <div className="h-[calc(100vh-57px)] p-6 overflow-y-auto">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <p className="text-sm text-gray-400 dark:text-gray-500">Platform-wide stats across all users and agents</p>
            {isFiltered && (
              <button onClick={clearSelection}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs border transition-colors"
                style={{ color: TEAL, borderColor: `${TEAL}40`, background: `${TEAL}10` }}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Clear selection
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-gray-400">From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputCls} />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-gray-400">To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputCls} />
            </div>
            {hasDateFilters && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#2a2a2a] transition-colors">
                Clear
              </button>
            )}
            <button onClick={loadAll} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors disabled:opacity-40">
              <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4"><SkeletonCard /><SkeletonCard /></div>
            <div className="grid grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
            <div className="grid grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}</div>
          </div>
        ) : allStats && d && (
          <div className="space-y-4">

            {/* Tables */}
            <div className="grid grid-cols-2 gap-4">
              {/* Users */}
              <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Users</span>
                  {selectedUserId && <span className="text-xs" style={{ color: TEAL }}>1 selected</span>}
                </div>
                <div className="overflow-y-auto max-h-48">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-[#252525] sticky top-0">
                      <tr>
                        <th className={thCls}>User</th>
                        <th className={thCls}>Username</th>
                        <th className={thCls}>Agents</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                      {(allStats.users || []).map((u, i) => {
                        const isSelected = selectedUserId === u.id;
                        const isDimmed = isFiltered && !isSelected;
                        return (
                          <tr key={i} onClick={() => handleUserClick(u.id)}
                            className="cursor-pointer transition-all"
                            style={{ background: isSelected ? `${TEAL}12` : undefined, opacity: isDimmed ? 0.3 : 1 }}>
                            <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">{u.first_name} {u.last_name}</td>
                            <td className="px-4 py-2.5 text-sm text-gray-400 dark:text-gray-500">@{u.username}</td>
                            <td className="px-4 py-2.5 text-sm font-semibold" style={{ color: isSelected ? TEAL : undefined }}>{u.agent_count || 0}</td>
                          </tr>
                        );
                      })}
                      {!allStats.users?.length && (
                        <tr><td colSpan={3} className="px-4 py-6 text-sm text-gray-400 text-center">No users</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Agents */}
              <div className="bg-white dark:bg-[#2a2a2a] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Agents</span>
                  {selectedAgentId && <span className="text-xs" style={{ color: TEAL }}>1 selected</span>}
                </div>
                <div className="overflow-y-auto max-h-48">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-[#252525] sticky top-0">
                      <tr>
                        <th className={thCls}>Agent</th>
                        <th className={thCls}>Owner</th>
                        <th className={thCls}>Tokens</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                      {visibleAgents.map((a, i) => {
                        const isSelected = selectedAgentId === a.id;
                        const isDimmed = selectedAgentId && !isSelected;
                        return (
                          <tr key={i} onClick={() => handleAgentClick(a.id)}
                            className="cursor-pointer transition-all"
                            style={{ background: isSelected ? `${TEAL}12` : undefined, opacity: isDimmed ? 0.3 : 1 }}>
                            <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">{a.name}</td>
                            <td className="px-4 py-2.5 text-sm text-gray-400 dark:text-gray-500">{a.owner || '—'}</td>
                            <td className="px-4 py-2.5 text-sm font-semibold" style={{ color: isSelected ? TEAL : undefined }}>{(a.token_count || 0).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                      {!visibleAgents.length && (
                        <tr><td colSpan={3} className="px-4 py-6 text-sm text-gray-400 text-center">No agents</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Stat cards — show spinner overlay while filtering */}
            <div className={`space-y-4 transition-opacity ${filtering ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>

              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">Platform</p>
                <div className="grid grid-cols-3 gap-4">
                  <StatCard label="Users" value={d.total_users}
                    icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
                  <StatCard label="Agents" value={d.total_agents}
                    icon="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  <StatCard label="Documents" value={d.total_documents}
                    icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">Chunks</p>
                <div className="grid grid-cols-3 gap-4">
                  <StatCard label="Parent Chunks" value={d.total_parent_chunks} sub={`${d.parent_tokens.toLocaleString()} tokens`}
                    icon="M4 6h16M4 10h16M4 14h10" />
                  <StatCard label="Child Chunks" value={d.total_child_chunks} sub={`${d.child_tokens.toLocaleString()} tokens`}
                    icon="M4 6h16M4 10h16M4 14h6" />
                  <StatCard label="Total Chunks" value={d.total_parent_chunks + d.total_child_chunks} sub={`${(d.parent_tokens + d.child_tokens).toLocaleString()} tokens`}
                    icon="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2.5">Cost</p>
                <div className="grid grid-cols-3 gap-4">
                  <CostCard childTokens={d.child_tokens} />
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
