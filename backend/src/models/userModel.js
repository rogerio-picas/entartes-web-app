// Importa a instância de ligação ao NeonDB
const sql = require('../config/db');

const getAllUsers = async () => {
  // Executa uma query real na base de dados
  // (Certifique-se de que a tabela 'users' já existe no NeonDB)
  const result = await sql`SELECT * FROM utilizador`;
  return result;
};

const getUserById = async (id) => {
  // Busca um utilizador específico pelo seu ID
  const result = await sql`SELECT * FROM utilizador WHERE id = ${id}`;
  return result[0];
};

const createUser = async (nome, email) => {
  // Executa o comando de inserção e retorna o utilizador recém-criado
  const result = await sql`INSERT INTO utilizador (nome, email) VALUES (${nome}, ${email}) RETURNING *`;
  return result[0];
};

module.exports = { getAllUsers, getUserById, createUser };