-- CreateEnum
CREATE TYPE "CompanyRelationType" AS ENUM ('SUBSIDIARY', 'INVESTMENT');

-- CreateTable
CREATE TABLE "CompanyRelationship" (
    "id" TEXT NOT NULL,
    "parentCompanyId" TEXT NOT NULL,
    "childCompanyId" TEXT NOT NULL,
    "type" "CompanyRelationType" NOT NULL,
    "ownershipPercentage" DECIMAL(5,2),
    "source" TEXT,
    "addedByAdminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyRelationship_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CompanyRelationship_parentCompanyId_idx" ON "CompanyRelationship"("parentCompanyId");

-- CreateIndex
CREATE INDEX "CompanyRelationship_childCompanyId_idx" ON "CompanyRelationship"("childCompanyId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyRelationship_parentCompanyId_childCompanyId_type_key" ON "CompanyRelationship"("parentCompanyId", "childCompanyId", "type");

-- AddForeignKey
ALTER TABLE "CompanyRelationship" ADD CONSTRAINT "CompanyRelationship_parentCompanyId_fkey" FOREIGN KEY ("parentCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyRelationship" ADD CONSTRAINT "CompanyRelationship_childCompanyId_fkey" FOREIGN KEY ("childCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
