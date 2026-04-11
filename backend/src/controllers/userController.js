
const bcrypt = require('bcryptjs');
const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();

// const userModel = require('../models/userModel');


const getUsers = async (req, res) => {
  try 
  {
    const users = await prisma.utilizador.findMany();
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
      include: {
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

async function createUser(req, res) 
{
  const { codigo_username, pass, id_tipo, nome, apelido, data_nascimento, email, telemovel, nif } = req.body;

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(pass,salt);
  
  try
  {
    if (!pass) return res.status(400).json({ error: "A password é obrigatória" });
    

    const newUser = await prisma.utilizador.create({
      data: {
        codigo_username,
        pass: hashedPassword,
        id_tipo: id_tipo ? parseInt(id_tipo) : null,
        nome,
        apelido,
        data_nascimento: data_nascimento ? new Date(data_nascimento) : null,
        email,
        telemovel,
        nif,
        tentativas_login: 0,
        estado: "ATIVO"
      }
    });

    res.status(201).json({ message: "Utilizador criado com sucesso"});
  }
  catch (error) 
  {
    console.error("DETALHE DO ERRO NO TERMINAL:", error);
    res.status(400).json({ 
      error: "Erro ao criar utilizador", 
      detalhe: error.message
    });
  }
}

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