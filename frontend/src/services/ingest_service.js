import { authHeaders } from './auth_service';

const API_URL = import.meta.env.VITE_API_URL;

export async function uploadFiles(agentId, files) {
  const formData = new FormData();
  formData.append('agent_id', agentId);
  files.forEach(file => formData.append('files', file));

  const res = await fetch(`${API_URL}/api/ingest`, {
    method: 'POST',
    headers: { ...authHeaders() },  // no Content-Type — browser sets multipart boundary
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Upload failed');
  return data;
}

export async function getJobStatus(jobId) {
  const res = await fetch(`${API_URL}/api/ingest/status/${jobId}`, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to get status');
  return data;
}
