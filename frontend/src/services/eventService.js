import { api } from './api'

export const eventService = {
  getAll: () => api.get('/event'),
  getById: (id) => api.get(`/event/${id}`),
}
