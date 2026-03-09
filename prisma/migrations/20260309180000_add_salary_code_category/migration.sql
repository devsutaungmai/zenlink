-- CreateTable
CREATE TABLE "SalaryCodeCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalaryCodeCategory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalaryCodeCategory_code_key" ON "SalaryCodeCategory"("code");

-- AlterTable (add categoryId to SalaryCode)
ALTER TABLE "SalaryCode" ADD COLUMN "categoryId" TEXT;

-- AlterTable (add default to category column)
ALTER TABLE "SalaryCode" ALTER COLUMN "category" SET DEFAULT 'HOURLY';

-- CreateIndex
CREATE INDEX "SalaryCode_categoryId_idx" ON "SalaryCode"("categoryId");

-- AddForeignKey
ALTER TABLE "SalaryCode" ADD CONSTRAINT "SalaryCode_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "SalaryCodeCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
