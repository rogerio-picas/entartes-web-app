const express = require('express');
const cors = require('cors');
const app = express();
const userRoutes = require('./src/routes/userRoutes');
const authRoutes = require('./src/routes/authRoutes');

app.use(cors());
app.use(express.json());


app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});


// app.post('/api/users', authorize(['CORDENACAO']), userController.createUser);

// app.get('/api/events', authorize(['COORDENACAO', 'DOCENTE', 'ALUNO']), eventController.listEvents);;
