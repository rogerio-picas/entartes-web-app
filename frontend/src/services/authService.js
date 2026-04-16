import { api } from './api'

export const authService = {
  async login(codigo_username, password) {
    const data = await api.post('/auth/login', { codigo_username, password })
    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    return data
  },

  logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  },

  getUser() {
    try {
      return JSON.parse(localStorage.getItem('user'))
    } catch {
      return null
    }
  },

  isAuthenticated() {
    return !!localStorage.getItem('token')
  },
}
