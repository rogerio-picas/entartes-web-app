const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 25,
  message: { message: 'Muitas tentativas de login. Tente novamente em 15 minutos.' }
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { message: 'Muitas requisições. Tente novamente mais tarde.' }
});

module.exports = { loginLimiter, apiLimiter };