const jwt = require('jsonwebtoken')
const tokenValidation = require('../../middlewares/authMiddleware')

process.env.JWT_SECRET = 'test-secret'

describe('tokenValidation middleware', () => {
  it('responds with 401 when no token is provided', () => {
    const req = { headers: {} }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    const next = jest.fn()

    tokenValidation(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('calls next and populates req.user with a valid token', () => {
    const token = jwt.sign({ id: 1, role: 2 }, 'test-secret')
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    const next = jest.fn()

    tokenValidation(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(req.user).toMatchObject({ id: 1, role: 2 })
  })
})
