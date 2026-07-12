const API_BASE = 'http://localhost:4000/api';

async function api(path, method = 'GET', body = null, useAuth = true) {
  const headers = { 'Content-Type': 'application/json' };
  if (useAuth) {
    const token = localStorage.getItem('af_token');
    if (token) headers['Authorization'] = 'Bearer ' + token;
  }
  const res = await fetch(API_BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  let data = {};
  try { data = await res.json(); } catch (e) { /* no body */ }
  if (!res.ok) {
    if (res.status === 401 && useAuth) {
      localStorage.removeItem('af_token');
      localStorage.removeItem('af_user');
      window.location.href = 'login.html';
    }
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

function currentUser() {
  try { return JSON.parse(localStorage.getItem('af_user')); } catch (e) { return null; }
}

function requireAuth() {
  if (!localStorage.getItem('af_token')) {
    window.location.href = 'login.html';
  }
}

function logout() {
  localStorage.removeItem('af_token');
  localStorage.removeItem('af_user');
  window.location.href = 'login.html';
}

function fmtDate(d) {
  if (!d) return '—';
  return String(d).slice(0, 10);
}
function fmtDateTime(d) {
  if (!d) return '—';
  return String(d).replace('T', ' ').slice(0, 16);
}
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, (m) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));
}
