const express = require('express');
const cors = require('cors');
require('dotenv').config();

const userRoutes = require('./entartes-web-app/backend/src/routes/userRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Regista as rotas da aplicação
app.use('/api/users', userRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});