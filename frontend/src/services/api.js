const BASE = '/api'

async function request(path, options = {}) {
  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  // 401 = não autenticado → terminar sessão
  // 403 = autorizado mas sem permissão → mostrar erro sem terminar sessão
  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
    return
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const errMsg = data.error || data.message || `Error ${res.status}`
    const err = new Error(errMsg)
    err.response = { status: res.status, data }
    throw err
  }

  return data
}

export const api = {
  get: (path, options = {}) => {
    let finalPath = path;
    if (options.params) {
      // Limpa params nulos/undefined e constrói a query string ?id_estado=1...
      const validParams = Object.fromEntries(Object.entries(options.params).filter(([_, v]) => v != null));
      if (Object.keys(validParams).length > 0) {
        finalPath += '?' + new URLSearchParams(validParams).toString();
      }
      // Remove params de dentro do options para não conflituar com a tag Headers do fetch original
      delete options.params;
    }
    return request(finalPath, options);
  },
  post: (path, body, options = {}) => request(path, { method: 'POST', body: JSON.stringify(body), ...options }),
  put: (path, body, options = {}) => request(path, { method: 'PUT', body: JSON.stringify(body), ...options }),
  delete: (path, options = {}) => request(path, { method: 'DELETE', ...options }),
}
