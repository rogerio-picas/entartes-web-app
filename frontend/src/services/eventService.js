import { api } from './api'

export const eventService = {
  getAll: () => api.get('/evento'),
  getMyEvents: () => api.get('/evento/meus-eventos'),
  getById: (id) => api.get(`/evento/${id}`),
  delete: (id) => api.delete(`/evento/${id}`),
  update: (id, dados) => api.put(`/evento/${id}`, dados),
}
