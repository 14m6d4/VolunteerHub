// Simple fetch wrapper for API calls
const API_BASE = (import.meta.env.VITE_API_URL as string) || '/api';

type FetchOptions = RequestInit & { query?: Record<string, string | number | boolean> };

function buildUrl(path: string, query?: Record<string, string | number | boolean>) {
  const url = new URL(path.startsWith('/') ? `${API_BASE}${path}` : `${API_BASE}/${path}`);
  if (query) {
    Object.entries(query).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  }
  return url.toString();
}

export async function apiFetch<T = any>(path: string, opts: FetchOptions = {}): Promise<T> {
  const token = localStorage.getItem('accessToken');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;

  const { query, ...fetchOpts } = opts;
  const url = buildUrl(path, query as any);

  const res = await fetch(url, { ...fetchOpts, headers });

  // Try to parse JSON when content-type indicates JSON, otherwise grab text
  const contentType = res.headers.get('content-type') || '';
  let data: any = null;

  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch (e) {
      // malformed JSON -> fallback to text
      const text = await res.text();
      data = text ? { message: text } : null;
    }
  } else {
    const text = await res.text();
    // If response is HTML or plain text, keep raw text under message key
    data = text ? { message: text } : null;
  }

  if (!res.ok) {
    // Prefer structured message, then statusText, finally generic
    const message = (data && (data.message || data.error)) || res.statusText || 'API error';
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }

  return data as T;
}

export function clearAuth() {
  localStorage.removeItem('accessToken');
}

export function setAuthToken(token: string) {
  try {
    localStorage.setItem('accessToken', token);
    // eslint-disable-next-line no-console
    console.debug('[api] set accessToken in localStorage');
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[api] failed to set accessToken in localStorage', e);
  }
}

export default apiFetch;
