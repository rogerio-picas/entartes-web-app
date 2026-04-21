
const bcrypt = require('bcryptjs');
const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();
const userService = require('../services/userService');

// const userModel = require('../models/userModel');


const getUsers = async (req, res) => {
  try
  {
    const { id_tipo } = req.query;
    const where = id_tipo ? { id_tipo: parseInt(id_tipo) } : {};

    const users = await prisma.utilizador.findMany({
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
      },
    });

    res.status(200).json(users);

  }
  catch (error)
  {
    res.status(500).json({ message: 'Erro ao encontrar utilizador.', error: error.message });
  }
};

const getUser = async (req, res) => {
  try 
  {
    const { id_utilizador } = req.params;
    const id_utilizador_int = parseInt(id_utilizador);

    if (isNaN(id_utilizador_int)) {
      return res.status(400).json({ 
        message: 'O ID fornecido não possui um formato válido.' 
      });
    }

    const user = await prisma.utilizador.findUnique({
      where:{
        id_utilizador: id_utilizador_int, 
      },
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
          tipo_utilizador: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Utilizador não encontrado' });
    }
    
    res.status(200).json(user);
  }
  catch (error)
  {
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
        console.error("Erro no Controller [createUser]:", error);

        // 5. Tratamento de erros específicos do Prisma
        if (error.code === 'P2002') {
            return res.status(400).json({ 
                error: "Erro de duplicação: O nome de utilizador, email ou NIF já existe." 
            });
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

    const updatedUser = await prisma.utilizador.update({
      where: {
        id_utilizador: parseInt(id_utilizador),
      },
      data: dataToUpdate,
    });

    res.status(200).json({
      message: 'Utilizador atualizado com sucesso',
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar', error: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id_utilizador } = req.params;

    await prisma.utilizador.delete({
      where: {
        id_utilizador: parseInt(id_utilizador),
      },
    });

    res.status(200).json({ message: 'Utilizador removido com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao eliminar utilizador', error: error.message });
  }
};


module.exports = { getUsers, getUser, createUser, updateUser, deleteUser };