const express = require('express');
const cors = require('cors');
const app = express();



// --- CONFIGURAÇÃO SWAGGER ---
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');


const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Entartes API Documentation',
      version: '1.0.0',
      description: 'Documentação interativa da API Entartes (Módulos: Auth, Users, Events, Coaching, Relatorios, Notificações, Salas, Anúncios)',
    },
    servers: [{ url: 'http://localhost:3000' }],
    tags: [
      { name: 'Auth', description: 'Endpoints de Autenticação (Login, Registo)' },
      { name: 'Users', description: 'Operações CRUD de Utilizadores' },
      { name: 'Events', description: 'Gestão de Eventos e relacionados' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  // DIRETÓRIO ONDE O SWAGGER VAI PROCURAR AS ANOTAÇÕES NAS ROTAS
  apis: ['./src/routes/*.js'], 
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
// ----------------------------

const authRoutes = require('./src/routes/authRoutes');
const userRoutes = require('./src/routes/userRoutes');
const eventRoutes = require('./src/routes/eventRoutes');
const coachingRoutes = require('./src/routes/coachingRoutes');
const relatorioRoutes = require('./src/routes/relatorioRoutes');
const anuncioRoutes = require('./src/routes/anuncioRoutes');
const availabilityRoutes = require('./src/routes/availabilityRoutes');
const horarioRoutes = require('./src/routes/horarioRoutes');
const aulasRoutes = require('./src/routes/aulasRoutes');
const notificacaoRoutes = require('./src/routes/notificacaoRoutes');
const salaRoutes = require('./src/routes/salaRoutes');
const modalidadeRoutes = require('./src/routes/modalidadeRoutes');

app.use(cors());
app.use(express.json());

// Rota da Documentação
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/evento', eventRoutes);
app.use('/api/anuncios', anuncioRoutes);
app.use('/api/disponibilidades', availabilityRoutes);
app.use('/api/coaching', coachingRoutes);
app.use('/api/relatorio', relatorioRoutes);
app.use('/api/horario', horarioRoutes);
app.use('/api/aulas', aulasRoutes);
app.use('/api/notificacoes', notificacaoRoutes);
app.use('/api/salas', salaRoutes);
app.use('/api/modalidades', modalidadeRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
  console.log(`Documentação disponível em: http://localhost:${PORT}/api-docs`);
});