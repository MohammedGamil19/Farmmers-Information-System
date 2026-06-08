const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getToken()
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  // Guard against empty bodies (e.g. 500s with no JSON)
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)
  return data
}

export const api = {
  get: (path: string) => apiFetch(path),
  post: (path: string, body: unknown) => apiFetch(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path: string, body: unknown) => apiFetch(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: (path: string, body?: unknown) => apiFetch(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: (path: string) => apiFetch(path, { method: 'DELETE' }),
}