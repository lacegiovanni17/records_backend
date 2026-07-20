/*
  Warnings:

  - Changed the type of `industry` on the `Company` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- Cast the enum column to text, preserving existing values
ALTER TABLE "Company"
  ALTER COLUMN "industry" TYPE TEXT USING "industry"::text;

-- Drop the now-unused enum type
DROP TYPE "Industry";
