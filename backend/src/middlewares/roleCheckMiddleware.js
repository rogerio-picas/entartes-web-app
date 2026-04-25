const jwt = require ('jsonwebtoken');

function authorize (allowedRoles = []){
    return (req, res, next) => {

        if (!req.user) {
            return res.status(401).json({ message: "Utilizador não autenticado" });
        }

        // O token já foi verificado pelo authMiddleware, então podemos usar req.user diretamente
        const userRole = Number(req.user.role);

        console.log("Role do utilizador:", userRole);
        console.log("Roles permitidas:", allowedRoles);

        if(!allowedRoles.includes(userRole)) {
            return res.status(403).json({ message : "Acesso negado: Perfil não autorizado"});
        }

        next();
    };
};

module.exports = authorize;