// const { PrismaClient } = require('@prisma/client');
// const prisma = new PrismaClient();
// const bcrypt = require('bcryptjs');

// const User = {
//   // Criar utilizador com password cifrada (RF-SEC-02, RNF-01)
//   create: async (data) => {
//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(data.password, salt);
    
//     return await prisma.user.create({
//       data: { ...data, password: hashedPassword }
//     });
//   },

//   findByEmail: async (email) => {
//     return await prisma.user.findUnique({
//       where: { email },
//       include: { tipo: true }
//   });
//   },

//   // Incrementar tentativas de login (RNF-01)
//   incrementLoginAttempts: async (id) => {
//     return await prisma.user.update({
//     where: { id: userId },
//     data: { login_attempts: attempts }
//   });
//   }
// };

// module.exports = User;