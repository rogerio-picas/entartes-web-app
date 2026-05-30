const { PrismaClient } = require('@prisma/client');

/**
 * Instância única (singleton) do PrismaClient partilhada por toda a aplicação.
 * Importar este módulo em vez de criar `new PrismaClient()` em cada ficheiro
 * garante que existe apenas um connection pool ativo.
 */
const prisma = new PrismaClient();

module.exports = prisma;
