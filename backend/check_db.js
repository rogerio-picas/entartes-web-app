const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const disp = await prisma.disponibilidade.findMany({ where: { id_docente: 20 } });
  console.log(JSON.stringify(disp, null, 2));
}

run().catch(console.error).finally(() => prisma.$disconnect());
