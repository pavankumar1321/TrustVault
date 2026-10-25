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
    const err = new Error(
      'Unable to connect to TrustVault server. Please verify the backend service is running.'
    );
    err.code = 'NETWORK_ERROR';
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
      proxyMsg || 'TrustVault service is temporarily unavailable. Please verify the backend server is running.'
    );
    err.code = 'SERVICE_UNAVAILABLE';
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
          errorMsg = rawText;
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
