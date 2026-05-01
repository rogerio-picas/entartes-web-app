const jwt = require('jsonwebtoken')
const tokenValidation = require('../../middlewares/authMiddleware')

process.env.JWT_SECRET = 'test-secret'

describe('tokenValidation middleware', () => {
  it('retorna erro 401 quando não fornece token', () => {
    const req = { headers: {} }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    const next = jest.fn()

    tokenValidation(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(next).not.toHaveBeenCalled()
  })

  it('passa para o next e preenche req.user com token válido', () => {
    const token = jwt.sign({ id: 1, role: 2 }, 'test-secret')
    const req = { headers: { authorization: `Bearer ${token}` } }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    const next = jest.fn()

    tokenValidation(req, res, next)

    expect(next).toHaveBeenCalledTimes(1)
    expect(req.user).toMatchObject({ id: 1, role: 2 })
  })

  it('retorna erro 401 quando token é inválido ou expirado', () => {
    const req = { headers: { authorization: `Bearer token-falso-123` } }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    const next = jest.fn()

    tokenValidation(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Token inválido ou sessão expirada.' })
    )
    expect(next).not.toHaveBeenCalled()
  })

  // ---------------------------------------------------------
  // NOVOS CENÁRIOS DE EDGE CASES E MAU USO
  // ---------------------------------------------------------

  it('retorna erro 401 quando o cabeçalho existe mas não tem a palavra "Bearer " (formato incorreto)', () => {
    // Exemplo: O frontend enviou apenas o token diretamente em vez de "Bearer <token>"
    const req = { headers: { authorization: `token-valido-mas-sem-bearer` } }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    const next = jest.fn()

    tokenValidation(req, res, next)

    // O código tenta fazer split(' ')[1]. Como não há espaços, o [1] é undefined.
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ message: 'Acesso negado. É necessária autenticação.' })
    expect(next).not.toHaveBeenCalled()
  })

  it('retorna erro 401 quando o cabeçalho só tem a palavra "Bearer " mas o token está vazio', () => {
    // Exemplo: O frontend enviou "Bearer " e esqueceu-se de concatenar o token JWT
    const req = { headers: { authorization: `Bearer ` } }
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() }
    const next = jest.fn()

    tokenValidation(req, res, next)

    // O código faz split(' ')[1], que neste caso devolve uma string vazia "".
    // !"" avalia para verdadeiro, logo aciona o erro de falta de autenticação.
    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({ message: 'Acesso negado. É necessária autenticação.' })
    expect(next).not.toHaveBeenCalled()
  })
})
