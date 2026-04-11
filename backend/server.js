const express = require('express');
const cors = require('cors');
const app = express();
const userRoutes = require('./src/routes/userRoutes');

app.use(cors());
app.use(express.json());


app.use('/api/users', userRoutes);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
  // console.log(`Teste a rota em: http://localhost:${PORT}/api/users/4`);
});


// app.post('/api/users', authorize(['CORDENACAO']), userController.createUser);

// app.get('/api/events', authorize(['COORDENACAO', 'DOCENTE', 'ALUNO']), eventController.listEvents);;
