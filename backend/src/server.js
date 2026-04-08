const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/saudacao', (req, res) => {
  res.status(200).json({ 
    mensage: 'API REST Response!',
    success: true 
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port${PORT}`);
});
