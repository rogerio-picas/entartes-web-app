import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { api } from '../../services/api.js'

describe('api client', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('attaches Authorization header when token is in localStorage', async () => {
    localStorage.setItem('token', 'test-token')
    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: () => Promise.resolve({}),
    })
    vi.stubGlobal('fetch', mockFetch)

    await api.get('/users')

    const [, options] = mockFetch.mock.calls[0]
    expect(options.headers['Authorization']).toBe('Bearer test-token')
  })
})
