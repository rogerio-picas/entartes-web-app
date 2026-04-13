// src/middlewares/roleCheck.js
const adminAuthCheck = (req, res, next) => {
  // 1. Verificação de segurança: garantir que o req.user existe
  if (!req.user) {
    return res.status(401).json({ error: "Utilizador não autenticado." });
  }

  // 2. Comparação com o ID numérico que definiste no authController (role: user.id_tipo)
  // Assumindo que 1 = Coordenadora
  if (req.user.role !== 1) { 
    return res.status(403).json({
      error: "Acesso negado. Apenas Coordenadoras podem realizar esta ação.",
    });
  }

  next();
};

module.exports = adminAuthCheck;