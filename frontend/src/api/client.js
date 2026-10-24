// TrustVault Unified API Client
const API_BASE = import.meta.env.VITE_API_URL || '';

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

export async function apiClient(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = { ...options.headers };

  // Set CSRF token from cookie if available
  const csrfToken = getCookie('trustvault_csrf');
  if (csrfToken && !headers['X-CSRF-Token']) {
    headers['X-CSRF-Token'] = csrfToken;
  }

  // Set JSON headers if body is an object and not FormData
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // essential for HTTP-only session cookies
    });
  } catch (netErr) {
    // Network error — backend is not reachable at all
    const err = new Error(
      'Backend server is not running. Please start it:\n\n' +
      '  Option 1: Double-click run_trustvault.bat\n' +
      '  Option 2: Open a terminal and run:\n' +
      '            python run_backend.py\n\n' +
      'Then refresh this page.'
    );
    err.code = 'BACKEND_OFFLINE';
    throw err;
  }

  // Handle proxy 503 — Vite proxy couldn't reach backend
  if (response.status === 503) {
    let proxyMsg = '';
    try {
      const proxyData = await response.json();
      proxyMsg = proxyData?.error?.message || '';
    } catch { /* ignore */ }

    const err = new Error(
      proxyMsg ||
      'Backend server is offline (503). Start it with: python run_backend.py'
    );
    err.code = 'BACKEND_OFFLINE';
    err.status = 503;
    throw err;
  }

  // 1. If response is not OK (error status), extract error message safely
  if (!response.ok) {
    let errorMsg = `Server error (${response.status}).`;
    let errorData = null;

    try {
      errorData = await response.json();
      errorMsg = errorData?.error?.message || errorData?.detail || errorMsg;
    } catch {
      try {
        const rawText = await response.text();
        if (rawText && rawText.length < 300) {
          if (rawText.includes('ECONNREFUSED') || rawText.includes('BACKEND_NOT_RUNNING')) {
            errorMsg = 'Backend server is not running on port 8000. Start it with: python run_backend.py';
          } else {
            errorMsg = rawText;
          }
        }
      } catch { /* ignore */ }
    }

    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = errorData;
    throw error;
  }

  // 2. Handle binary file downloads (only on 2xx OK responses)
  const contentType = response.headers.get('content-type') || '';
  const contentDisp = response.headers.get('content-disposition') || '';
  const isAttachment = contentDisp.toLowerCase().includes('attachment');
  const isBinary = contentType && !contentType.includes('application/json') && !contentType.includes('text/');

  if (isAttachment || isBinary) {
    return response.blob();
  }

  // 3. Parse JSON response
  let data;
  try {
    data = await response.json();
  } catch (err) {
    data = { success: true, message: 'Operation completed successfully.' };
  }

  return data;
}
