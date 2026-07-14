import { PrismaClient } from '@prisma/client';
// import { seedAdmins } from './admin.seed';
import { seedCompanies } from './company.seed';

const prisma = new PrismaClient();

async function main() {
  // await seedAdmins(prisma);
  await seedCompanies(prisma);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
