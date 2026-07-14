-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('VERIFIED', 'PARTIAL', 'UNVERIFIED');

-- CreateEnum
CREATE TYPE "RedlistStatus" AS ENUM ('FLAGGED', 'CLEAN');

-- CreateEnum
CREATE TYPE "Industry" AS ENUM ('ENERGY', 'FINANCE', 'MANUFACTURING', 'TECH', 'TRADING');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "countryName" TEXT NOT NULL,
    "industry" "Industry" NOT NULL,
    "companyType" TEXT NOT NULL,
    "incorporationDate" DATE NOT NULL,
    "email" TEXT NOT NULL,
    "registeredAddress" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "foundedDate" DATE,
    "marketCap" DECIMAL(20,2),
    "logoUrl" TEXT,
    "about" TEXT,
    "regulatoryAuthority" TEXT,
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "redlistStatus" "RedlistStatus" NOT NULL DEFAULT 'CLEAN',
    "archivedAt" TIMESTAMP(3),
    "archivedBy" TEXT,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_registrationNumber_key" ON "Company"("registrationNumber");
