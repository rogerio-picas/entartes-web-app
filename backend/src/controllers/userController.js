const userModel = require('../models/userModel');

const getUsers = async (req, res) => {
  try {
    // O Controller pede os dados ao Model
    const users = await userModel.getAllUsers();
    
    // O Controller responde ao cliente (a nossa "View" em JSON)
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Error seaching for users', error: error.message });
  }
};

const getUser = async (req, res) => {
  try {
    // Extrai o ID dos parâmetros da rota (ex: /api/users/1)
    const { id } = req.params;
    const user = await userModel.getUserById(id);
    
    if (!user) {
      return res.status(404).json({ message: 'Utilizador não encontrado' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao obter o utilizador', error: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    // Extrai o nome e o email do corpo do pedido (JSON)
    const { nome, email } = req.body;
    
    // Pede ao Model para criar o utilizador
    const newUser = await userModel.createUser(nome, email);
    
    // Responde ao cliente com status 201 (Created) e os dados inseridos
    res.status(201).json(newUser);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao inserir utilizador na base de dados', error: error.message });
  }
};

module.exports = { getUsers, getUser, createUser };