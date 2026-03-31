const API_URL = import.meta.env.VITE_API_URL;

export async function signup({ firstName, lastName, username, email, password, companyName, website }) {
  const res = await fetch(`${API_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      first_name: firstName,
      last_name: lastName,
      username,
      email,
      password,
      company_name: companyName || null,
      website: website || null,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Signup failed');
  localStorage.setItem('archelon_token', data.token);
  localStorage.setItem('archelon_user', JSON.stringify(data.user));
  return data;
}

export async function login(identifier, password) {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Login failed');
  localStorage.setItem('archelon_token', data.token);
  localStorage.setItem('archelon_user', JSON.stringify(data.user));
  return data;
}

export function getToken() {
  return localStorage.getItem('archelon_token');
}

export function getUser() {
  const u = localStorage.getItem('archelon_user');
  return u ? JSON.parse(u) : null;
}

export function authHeaders() {
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

export function logout() {
  localStorage.removeItem('archelon_token');
  localStorage.removeItem('archelon_user');
}

export async function deleteAccount() {
  const res = await fetch(`${API_URL}/api/auth/account`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to delete account');
  logout();
  return data;
}
