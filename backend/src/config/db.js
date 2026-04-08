const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

// Inicializa a ligação usando a string de ligação guardada no .env
const sql = neon(process.env.DATABASE_URL);

module.exports = sql;