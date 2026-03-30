import { authHeaders } from './auth_service';

const API_URL = import.meta.env.VITE_API_URL;
const _cache = {};

export function clearCache() {
  Object.keys(_cache).forEach(k => delete _cache[k]);
}

export async function fetchAgents(forceRefresh = false) {
  const key = 'agents';
  if (!forceRefresh && _cache[key]) return _cache[key];
  const res = await fetch(`${API_URL}/api/agents`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch agents');
  _cache[key] = data;
  return data;
}

export async function createAgent({ name, description, instructions, model }) {
  const res = await fetch(`${API_URL}/api/agents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ name, description, instructions, model }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to create agent');
  delete _cache['agents'];  // invalidate so next fetch is fresh
  return data;
}

export async function updateAgent(agentId, updates) {
  const res = await fetch(`${API_URL}/api/agents/${agentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to update agent');
  delete _cache['agents'];  // invalidate
  return data;
}

export async function deleteAgent(agentId) {
  const res = await fetch(`${API_URL}/api/agents/${agentId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to delete agent');
  delete _cache['agents'];  // invalidate
  return data;
}
