import {
  PrismaClient,
  VerificationStatus,
  RedlistStatus,
} from '@prisma/client';
import industries from '../../../src/modules/industries/data/industries.json';

const INDUSTRIES = industries;
const VERIFICATION = Object.values(VerificationStatus);
const REDLIST = Object.values(RedlistStatus);
const COUNTRIES = ['NG', 'GH', 'DE', 'IL', 'US', 'GB', 'ZA', 'KE', 'FR', 'AE'];
const COMPANY_TYPES = ['Private AG', 'Public Ltd', 'LLC', 'GmbH', 'PLC'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function seedCompanies(prisma: PrismaClient): Promise<void> {
  const TOTAL = 500;
  const companies = Array.from({ length: TOTAL }, (_, i) => {
    const n = String(i + 1).padStart(4, '0');
    return {
      name: `Seed Company ${n}`, // obviously synthetic
      registrationNumber: `SEED-${n}`, // obviously synthetic
      countryCode: pick(COUNTRIES),
      countryName: pick(COUNTRIES), // placeholder — see note below
      industry: pick(INDUSTRIES),
      companyType: pick(COMPANY_TYPES),
      incorporationDate: new Date(2000 + (i % 25), i % 12, (i % 28) + 1),
      email: `info@seed${n}.example.com`,
      riskScore: Math.floor(Math.random() * 101), // 0–100, spreads across all risk bands
      verificationStatus: pick(VERIFICATION),
      redlistStatus: pick(REDLIST),
    };
  });

  // createMany — one bulk insert, far faster than 500 individual creates
  await prisma.company.createMany({ data: companies, skipDuplicates: true });
  console.log(`✅ Seeded ${TOTAL} companies`);
}
