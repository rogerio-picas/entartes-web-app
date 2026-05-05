'use strict';

const mockLimiter = jest.fn();

jest.mock('express-rate-limit', () => jest.fn(() => mockLimiter));

const rateLimit = require('express-rate-limit');
const { loginLimiter, apiLimiter } = require('../../middlewares/rateLimitMiddleware');

describe('rateLimitMiddleware', () => {
  it('exporta loginLimiter e apiLimiter', () => {
    expect(loginLimiter).toBeDefined();
    expect(apiLimiter).toBeDefined();
  });

  it('cria loginLimiter com janela de 15 minutos e máximo de 25 pedidos', () => {
    const loginConfig = rateLimit.mock.calls.find(
      ([cfg]) => cfg.max === 25
    )?.[0];

    expect(loginConfig).toBeDefined();
    expect(loginConfig.windowMs).toBe(15 * 60 * 1000);
    expect(loginConfig.message).toEqual({ message: 'Muitas tentativas de login. Tente novamente em 15 minutos.' });
  });

  it('cria apiLimiter com janela de 1 minuto e máximo de 100 pedidos', () => {
    const apiConfig = rateLimit.mock.calls.find(
      ([cfg]) => cfg.max === 100
    )?.[0];

    expect(apiConfig).toBeDefined();
    expect(apiConfig.windowMs).toBe(60 * 1000);
    expect(apiConfig.message).toEqual({ message: 'Muitas requisições. Tente novamente mais tarde.' });
  });

  it('loginLimiter tem limite mais restritivo que apiLimiter', () => {
    const loginConfig = rateLimit.mock.calls.find(([cfg]) => cfg.max === 25)?.[0];
    const apiConfig = rateLimit.mock.calls.find(([cfg]) => cfg.max === 100)?.[0];

    expect(loginConfig.max).toBeLessThan(apiConfig.max);
    expect(loginConfig.windowMs).toBeGreaterThan(apiConfig.windowMs);
  });
});
