-- CreateEnum
CREATE TYPE "VerificationSource" AS ENUM ('PREMBLY', 'ADMIN');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "premblyReference" TEXT,
ADD COLUMN     "verificationSource" "VerificationSource",
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedByAdminId" TEXT;
