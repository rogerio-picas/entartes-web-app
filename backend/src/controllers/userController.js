// CORREÇÃO: importação de bcrypt não era usada neste controlador (a lógica de hash está no serviço)
const userService = require('../services/userService');
const userProfileService = require('../services/userProfileService');

const getUsers = async (req, res) => {

  try {
    const { id_tipo } = req.query;
    const where = id_tipo ? { id_tipo: parseInt(id_tipo) } : {};

    const users = await userService.getUsers({
      where,
      orderBy: { nome: 'asc' },
      select: {
        id_utilizador: true,
        codigo_username: true,
        nome: true,
        apelido: true,
        email: true,
        telemovel: true,
        data_nascimento: true,
        nif: true,
        estado: true,
        id_tipo: true,
        aluno: {
          select: {
            coaching: true,
            aluno_modalidade: {
              select: {
                id_modalidade: true,
                modalidade: {
                  select: {
                    nome: true
                  }
                }
              }
            }
          }
        },
      },
    });

    res.status(200).json(users);

  }
  catch (error) {
    res.status(500).json({ message: 'Erro ao encontrar utilizador.', error: error.message });
  }
};

const getUser = async (req, res) => {
  try {
    const { id_utilizador } = req.params;
    const id_utilizador_int = parseInt(id_utilizador);

    if (isNaN(id_utilizador_int)) {
      return res.status(400).json({ message: 'ID do utilizador inválido.' });
    }

    const user = await userService.getUser({
      where: { id_utilizador: id_utilizador_int },
      select: {
        id_utilizador: true,
        codigo_username: true,
        nome: true,
        apelido: true,
        email: true,
        telemovel: true,
        data_nascimento: true,
        nif: true,
        estado: true,
        tipo_utilizador: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilizador não encontrado' });
    }
    res.status(200).json(user);
  }
  catch (error) {
    res.status(500).json({ message: 'Erro ao obter o utilizador', error: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    // 1. Extração de dados do corpo da requisição
    const { codigo_username, password, id_tipo, email } = req.body;

    // 2. Validação básica de presença de campos obrigatórios
    // (A validação de negócio profunda é feita no Service ou em Middlewares)
    if (!codigo_username || !password || !id_tipo || !email) {
      return res.status(400).json({
        error: "Dados insuficientes. 'codigo_username', 'email', 'password' e 'id_tipo' são obrigatórios."
      });
    }

    // 3. Chamada ao Service
    // Passamos o req.body completo para o Service tratar todos os campos opcionais
    const novoUtilizador = await userService.criarUtilizador(req.body);

    return res.status(201).json({
      status: "Success",
      message: "Utilizador criado com sucesso.",
      data: {
        id_utilizador: novoUtilizador.id_utilizador,
        codigo_username: novoUtilizador.codigo_username,
        id_tipo: novoUtilizador.id_tipo,
        email: novoUtilizador.email
      }
    });

  } catch (error) {
    // Logging de erros é responsabilidade do middleware de erros global, não do controller.

    // 5. Duplicados detetados pelo pré-check do serviço (verifica todos os campos em paralelo
    //    antes do insert, para que a mensagem liste todos os conflitos de uma só vez).
    //    O P2002 serve de fallback para a janela de corrida entre o pré-check e o insert.
    if (error.code === 'DUPLICATE') {
      return res.status(409).json({ error: error.message });
    }
    if (error.code === 'P2002') {
      const campoLabels = {
        nif:             'NIF',
        email:           'endereço de e-mail',
        codigo_username: 'nome de utilizador',
        telemovel:       'número de telemóvel',
      };
      const campo = error.meta?.target?.[0];
      const label = campoLabels[campo];
      const mensagem = label
        ? `Já existe um utilizador registado com este ${label}.`
        : 'Erro de duplicação: o nome de utilizador, e-mail ou NIF já existe.';
      return res.status(409).json({ error: mensagem });
    }

    // Erro genérico (ex: falha na base de dados ou erro de lógica no Service)
    return res.status(400).json({
      error: "Não foi possível criar o utilizador.",
      detalhe: error.message
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id_utilizador } = req.params;
    const dataToUpdate = req.body;

    // CORREÇÃO: ID do parâmetro não era validado antes de chamar o serviço
    const id = parseInt(id_utilizador);
    if (isNaN(id)) return res.status(400).json({ message: 'ID do utilizador inválido.' });

    const updatedUser = await userService.atualizarUtilizador(id, dataToUpdate);

    res.status(200).json({
      message: 'Utilizador atualizado com sucesso',
      user: updatedUser
    });
  } catch (error) {
    // Unique constraint violation (e.g. NIF duplicado) — o serviço já traduz o P2002 numa mensagem legível
    if (error.message.includes('Já existe')) {
      return res.status(409).json({ message: error.message });
    }
    res.status(500).json({ message: 'Erro ao atualizar', error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id_utilizador } = req.params;

    // CORREÇÃO: ID do parâmetro não era validado antes de chamar o serviço
    const id = parseInt(id_utilizador);
    if (isNaN(id)) return res.status(400).json({ message: 'ID do utilizador inválido.' });

    await userService.deleteUser(id);

    res.status(200).json({ message: 'Utilizador removido com sucesso' });
  } catch (error) {
    if (error.message === 'Utilizador não encontrado') {
      return res.status(404).json({ message: error.message });
    }
    res.status(500).json({ message: 'Erro ao eliminar utilizador', error: error.message });
  }
};

const atualizarPassword = async (req, res) => {
  try {
    const { id_utilizador } = req.params;
    const { oldPassword, newPassword } = req.body;

    // CORREÇÃO: ID do parâmetro não era validado antes de chamar o serviço
    const id = parseInt(id_utilizador);
    if (isNaN(id)) return res.status(400).json({ error: 'ID do utilizador inválido.' });

    // CORREÇÃO: rota permite roles [1,2,3] mas não havia verificação de ownership —
    // a Coordenadora (role 1) pode alterar a password de qualquer utilizador;
    // os restantes roles só podem alterar a sua própria
    if (id !== req.user.id && req.user.role !== 1) {
      return res.status(403).json({ error: 'Sem permissão para alterar a password deste utilizador.' });
    }

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        error: 'Password antiga e nova password são obrigatórias.'
      });
    }

    const resultado = await userProfileService.atualizarPassword(
      id,
      oldPassword,
      newPassword
    );

    res.status(200).json(resultado);
  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
};

const atualizarDadosPessoais = async (req, res) => {
  try {
    const { id_utilizador } = req.params;

    // CORREÇÃO: ID do parâmetro não era validado antes de chamar o serviço
    const id = parseInt(id_utilizador);
    if (isNaN(id)) return res.status(400).json({ error: 'ID do utilizador inválido.' });

    // CORREÇÃO: rota permite roles [1,2,3] mas não havia verificação de ownership —
    // a Coordenadora (role 1) pode alterar os dados de qualquer utilizador;
    // os restantes roles só podem alterar os seus próprios
    if (id !== req.user.id && req.user.role !== 1) {
      return res.status(403).json({ error: 'Sem permissão para alterar os dados deste utilizador.' });
    }

    if (!req.body.email && !req.body.telemovel) {
      return res.status(400).json({ error: 'Forneça pelo menos o email ou telemóvel.' });
    }

    const resultado = await userProfileService.atualizarDadosPessoais(id, req.body);
    res.status(200).json(resultado);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  atualizarPassword,
  atualizarDadosPessoais
};
