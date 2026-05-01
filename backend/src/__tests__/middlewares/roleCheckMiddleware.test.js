const authorize = require('../../middlewares/roleCheckMiddleware');

describe('roleCheckMiddleware (authorize)', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    // Reset aos mocks antes de cada teste
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();

    // Suprime o console.log para não sujar o terminal durante os testes
    jest.spyOn(console, 'log').mockImplementation(() => { });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('retorna erro 401 quando req.user não existe (não autenticado)', () => {
    const middleware = authorize([1, 2]);

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Utilizador não autenticado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna erro 403 quando o utilizador tem uma role não permitida', () => {
    req.user = { role: 3 }; // Role 3 (ex: Aluno)
    const middleware = authorize([1, 2]); // Permite 1 (Admin) e 2 (Docente)

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Acesso negado: Perfil não autorizado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('retorna erro 403 se o array de roles permitidas estiver vazio', () => {
    req.user = { role: 1 };
    const middleware = authorize(); // Array de roles vazio por omissão

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Acesso negado: Perfil não autorizado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('passa para o next quando o utilizador tem uma role permitida', () => {
    req.user = { role: 2 }; // Role 2
    const middleware = authorize([1, 2, 3]); // Permite 1, 2 e 3

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it('passa para o next mesmo que a role venha como string no payload (type casting)', () => {
    req.user = { role: "2" }; // O payload do JWT às vezes pode trazer strings
    const middleware = authorize([1, 2]); // Array de inteiros

    middleware(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------
  // NOVOS CENÁRIOS DE EDGE CASES E PROTEÇÃO CONTRA MAUS USOS
  // ---------------------------------------------------------

  it('retorna erro 403 se o token existir mas não contiver a propriedade "role"', () => {
    req.user = { id: 10 };
    const middleware = authorize([1, 2]);

    middleware(req, res, next);

    // Number(undefined) dá NaN. NaN não está incluído em [1,2], logo recusa (403)
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Acesso negado: Perfil não autorizado' });
    expect(next).not.toHaveBeenCalled();
  });

  it('falha o acesso (403) se o programador configurar a rota com strings em vez de inteiros', () => {
    req.user = { role: 2 };
    const middleware = authorize(['1', '2']); // programador usou array de strings por engano!

    middleware(req, res, next);

    // O middleware atual faz Number(req.user.role) = 2.
    // ['1', '2'].includes(2) é FALSO (porque usa validação estrita ===).
    // O sistema corta o acesso. É um bom cenário de teste para provar como o middleware funciona.
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('lança um erro se o programador configurar a rota com um número em vez de um array', () => {
    req.user = { role: 1 };
    const middleware = authorize(1); // programador usou authorize(1) em vez de authorize([1])

    // O javascript vai atirar TypeError porque 1.includes() não é uma função
    expect(() => {
      middleware(req, res, next);
    }).toThrow(TypeError);
  });
});
