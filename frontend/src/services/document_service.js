import { authHeaders } from './auth_service';

const API_URL = import.meta.env.VITE_API_URL;

export async function fetchDocuments(agentId) {
  const res = await fetch(`${API_URL}/api/agents/${agentId}/documents`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to fetch documents');
  return data;
}
