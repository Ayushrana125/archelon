import { authHeaders } from './auth_service';

const API_URL = import.meta.env.VITE_API_URL;
const _cache = {};

export async function fetchDocuments(agentId, forceRefresh = false) {
  const key = `docs_${agentId}`;
  if (!forceRefresh && _cache[key]) return _cache[key];
  const res = await fetch(`${API_URL}/api/agents/${agentId}/documents`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch documents');
  _cache[key] = data;
  return data;
}

export function invalidateDocuments(agentId) {
  delete _cache[`docs_${agentId}`];
}
