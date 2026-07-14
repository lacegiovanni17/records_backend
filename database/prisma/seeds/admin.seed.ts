import { PrismaClient } from '@prisma/client';
import {
  UserType,
  AdminRole,
} from '../../../src/shared/interfaces/role.interface';

export async function seedAdmins(prisma: PrismaClient): Promise<void> {
  const email = process.env.SUPER_ADMIN_EMAIL;
  if (!email) throw new Error('SUPER_ADMIN_EMAIL is not set in .env');

  await prisma.admin.upsert({
    where: { email },
    update: {},
    create: {
      email,
      userType: UserType.SUPER_ADMIN,
      role: AdminRole.OVERSEER,
      isActive: true,
    },
  });

  console.log(`Super admin seeded: ${email}`);
}
