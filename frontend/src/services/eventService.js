import { api } from './api'

export const eventService = {
  getAll: () => api.get('/evento'),
  getById: (id) => api.get(`/evento/${id}`),
}
