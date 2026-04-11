const { neon } = require('@neondatabase/serverless');
require('dotenv').config();

// Inicializa a ligação usando a stringr de ligação guardada no .env
const sql = neon(process.env.DATABASE_URL);

module.exports = sql;