import { authHeaders } from './auth_service';

import API_URL from './api';
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

export async function deleteDocument(agentId, documentId) {
  const res = await fetch(`${API_URL}/api/agents/${agentId}/documents/${documentId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to delete document');
  invalidateDocuments(agentId);
  delete _cache[`history_${documentId}`];
  return data;
}

export async function fetchDocumentHistory(agentId, documentId, forceRefresh = false) {
  const key = `history_${documentId}`;
  if (!forceRefresh && _cache[key]) return _cache[key];
  const res = await fetch(`${API_URL}/api/agents/${agentId}/documents/${documentId}/history`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch history');
  _cache[key] = data;
  return data;
}

export function getCachedDocuments(agentId) {
  return _cache[`docs_${agentId}`] ?? null;
}

export function invalidateDocuments(agentId) {
  delete _cache[`docs_${agentId}`];
}

export function clearDocumentCache() {
  Object.keys(_cache).forEach(k => delete _cache[k]);
}
