const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Muitas tentativas de login'
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100
});

module.exports = { loginLimiter, apiLimiter };