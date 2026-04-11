// Aqui ficarão as consultas à base de dados (ex: NeonDB)

// Dados mockados temporariamente para exemplificar a estrutura
const users = [
  { id: 1, name: 'Alice', email: 'alice@exemplo.com' },
  { id: 2, name: 'Bob', email: 'bob@exemplo.com' }
];

const getAllUsers = async () => {
  // Simula um pedido assíncrono à base de dados
  return users;
};

module.exports = { getAllUsers };