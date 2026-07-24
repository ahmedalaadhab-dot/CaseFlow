-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "ekeyPassword" TEXT,
ADD COLUMN     "ekeyUsername" TEXT,
ADD COLUMN     "molPassword" TEXT,
ADD COLUMN     "molUsername" TEXT,
ADD COLUMN     "sioPassword" TEXT,
ADD COLUMN     "sioUsername" TEXT,
ADD COLUMN     "tamkeenPassword" TEXT,
ADD COLUMN     "tamkeenUsername" TEXT;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "folderId" TEXT;

-- CreateTable
CREATE TABLE "DocumentFolder" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentFolder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DocumentFolder_caseId_idx" ON "DocumentFolder"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentFolder_caseId_name_key" ON "DocumentFolder"("caseId", "name");

-- CreateIndex
CREATE INDEX "Document_folderId_idx" ON "Document"("folderId");

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "DocumentFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentFolder" ADD CONSTRAINT "DocumentFolder_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;
