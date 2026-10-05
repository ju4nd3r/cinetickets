import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial system check...');
  await prisma.systemCheck.upsert({
    where: { key: 'system_initialized' },
    update: { value: 'true' },
    create: {
      key: 'system_initialized',
      value: 'true',
    },
  });
  console.log('Initial seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
