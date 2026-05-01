/**
 * @file app.js
 * @description Instância Express exportável para uso em testes (supertest).
 * O servidor não chama app.listen() — isso é feito em server.js.
 */
'use strict';

const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Rotas
const authRoutes       = require('./src/routes/authRoutes');
const userRoutes       = require('./src/routes/userRoutes');
const eventRoutes      = require('./src/routes/eventRoutes');
const coachingRoutes   = require('./src/routes/coachingRoutes');
const relatorioRoutes  = require('./src/routes/relatorioRoutes');
const anuncioRoutes    = require('./src/routes/anuncioRoutes');
const availabilityRoutes = require('./src/routes/availabilityRoutes');
const horarioRoutes    = require('./src/routes/horarioRoutes');
const notificacaoRoutes= require('./src/routes/notificacaoRoutes');
const salaRoutes       = require('./src/routes/salaRoutes');
const modalidadeRoutes = require('./src/routes/modalidadeRoutes');

app.use('/api/auth',            authRoutes);
app.use('/api/users',           userRoutes);
app.use('/api/evento',          eventRoutes);
app.use('/api/anuncios',        anuncioRoutes);
app.use('/api/disponibilidades',availabilityRoutes);
app.use('/api/coaching',        coachingRoutes);
app.use('/api/relatorio',       relatorioRoutes);
app.use('/api/horario',         horarioRoutes);
app.use('/api/notificacoes',    notificacaoRoutes);
app.use('/api/salas',           salaRoutes);
app.use('/api/modalidades',     modalidadeRoutes);

module.exports = app;
