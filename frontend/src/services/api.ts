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
  const headers: any = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
  };

  if (opts.body instanceof FormData) {
    delete headers['Content-Type'];
  } else if (headers['Content-Type'] === 'application/json' && opts.body && typeof opts.body === 'object') {
    opts.body = JSON.stringify(opts.body);
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.debug('[apiFetch] Token found, sending Authorization header');
  } else {
    console.debug('[apiFetch] No token in localStorage for path:', path);
  }

  const { query, ...fetchOpts } = opts;
  const url = buildUrl(path, query as any);

  let res: Response;
  try {
    res = await fetch(url, { ...fetchOpts, headers });
  } catch (err: any) {
    const e: any = new Error('Network error: failed to reach API');
    e.isNetworkError = true;
    e.original = err;
    throw e;
  }
  console.log("res in api.ts: ", res);

  const contentType = res.headers.get('content-type') || '';
  let data: any = null;

  if (contentType.includes('application/json')) {
    try {
      data = await res.json();
    } catch (e) {
      const text = await res.text();
      data = text ? { message: text } : null;
    }
  } else {
    const text = await res.text();
    data = text ? { message: text } : null;
  }

  if (!res.ok) {
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
    console.debug('[api] set accessToken in localStorage');
    window.dispatchEvent(new Event('authTokenChanged'));
  } catch (e) {
    console.error('[api] failed to set accessToken in localStorage', e);
  }
}

// const api = {
//   get: <T = any>(path: string, opts?: FetchOptions) => apiFetch<T>(path, { ...opts, method: 'GET' }),
//   post: <T = any>(path: string, body?: any, opts?: FetchOptions) => 
//     apiFetch<T>(path, { ...opts, method: 'POST', body: body ? JSON.stringify(body) : undefined }),
//   patch: <T = any>(path: string, body?: any, opts?: FetchOptions) => 
//     apiFetch<T>(path, { ...opts, method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
//   delete: <T = any>(path: string, opts?: FetchOptions) => 
//     apiFetch<T>(path, { ...opts, method: 'DELETE' }),
//   put: <T = any>(path: string, body?: any, opts?: FetchOptions) => 
//     apiFetch<T>(path, { ...opts, method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
// };

// export default api;

export default apiFetch;
