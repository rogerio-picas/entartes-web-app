const jwt = require('jsonwebtoken');

const tokenValidation = (req, res, next) =>{
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if(!token) return res.status(401).json({ message: "Acesso negado. É necessária autenticação."});

    try
    {
        const verified = jwt.verify(token, process.env.JWT_SECRET);

        req.user = verified;

        next();
    }
    catch(error)
    {
        res.status(401).json({ message: "Token inválido ou sessão expirada.", error: error.message});
    }
};

module.exports = tokenValidation;