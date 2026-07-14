-- CreateEnum
CREATE TYPE "PersonRole" AS ENUM ('DIRECTOR', 'SHAREHOLDER', 'CFO', 'CEO', 'FOUNDER', 'CO_FOUNDER', 'BOARD_MEMBER');

-- CreateTable
CREATE TABLE "CompanyIndividual" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "individualId" TEXT NOT NULL,
    "roles" "PersonRole"[],
    "isKeyPerson" BOOLEAN NOT NULL DEFAULT false,
    "ownershipPercentage" DECIMAL(5,2),
    "source" TEXT,
    "appointedAt" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyIndividual_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyIndividual_companyId_individualId_key" ON "CompanyIndividual"("companyId", "individualId");

-- AddForeignKey
ALTER TABLE "CompanyIndividual" ADD CONSTRAINT "CompanyIndividual_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyIndividual" ADD CONSTRAINT "CompanyIndividual_individualId_fkey" FOREIGN KEY ("individualId") REFERENCES "Individual"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
