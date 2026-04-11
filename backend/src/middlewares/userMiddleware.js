const jwt = require ('jsonwebtoken');

function authorize (allowedRoles = []){
    return (req, res, next) => {
        const token = req.headers['authorization'];

        if(!token) return res.status(401).json({ message: "Token não fornecido"});

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if(err) return res.status(401).json({ message: "Token inválido ou Sessão Expirada"});
            if(!allowedRoles.includes(decoded.role)) return res.status(403).json({ message : "Acesso negado: Perfil não autorizado"});
            
            req.user = decoded;
            next();
        });
    };
};

module.exports = authorize;