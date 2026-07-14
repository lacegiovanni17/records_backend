-- CreateIndex
CREATE INDEX "Company_deletedAt_archivedAt_industry_riskScore_idx" ON "Company"("deletedAt", "archivedAt", "industry", "riskScore");
