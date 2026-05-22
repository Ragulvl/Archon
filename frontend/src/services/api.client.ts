// ─── API Base URL ─────────────────────────────────────────────────────────────
// In production via Nginx, relative /api/v1 works fine (same domain).
// Set VITE_API_URL only if the frontend and backend are on different domains.
const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '/api/v1';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      // Attach auth token if stored (for non-guest auth in future)
      ...(localStorage.getItem('auth_token')
        ? { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
        : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => ({ success: false, error: res.statusText }));

  if (!res.ok || !json.success) {
    throw new ApiError(res.status, json.error ?? 'Unknown error');
  }

  return json.data as T;
}

export const api = {
  get:    <T>(path: string)               => request<T>('GET',    path),
  post:   <T>(path: string, body: unknown) => request<T>('POST',   path, body),
  patch:  <T>(path: string, body: unknown) => request<T>('PATCH',  path, body),
  put:    <T>(path: string, body: unknown) => request<T>('PUT',    path, body),
  delete: <T>(path: string)               => request<T>('DELETE', path),
};

export { ApiError };
