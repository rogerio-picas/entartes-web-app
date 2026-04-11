
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
    const { id } = req.params;
    const user = await prisma.utilizador.findUnique(id);
    
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

module.exports = { getUsers, getUser, createUser };