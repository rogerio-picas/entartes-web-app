const express = require('express');
const cors = require('cors');
const app = express();
const userRoutes = require('./src/routes/userRoutes');

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});

app.use('/api/users', userRoutes);

// app.post('/api/users', authorize(['CORDENACAO']), userController.createUser);

// app.get('/api/events', authorize(['COORDENACAO', 'DOCENTE', 'ALUNO']), eventController.listEvents);;
