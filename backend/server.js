const express = require('express');
const cors = require('cors');
const app = express();
const userRoutes = require('./src/routes/userRoutes');
const authRoutes = require('./src/routes/authRoutes');
const eventRoutes = require('./src/routes/eventRoutes');
const coachingRoutes = require('./src/routes/coachingRoutes');

app.use(cors());
app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/coaching', coachingRoutes);


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});
