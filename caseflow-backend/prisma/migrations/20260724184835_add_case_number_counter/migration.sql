-- CreateTable
CREATE TABLE "CaseNumberCounter" (
    "year" INTEGER NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CaseNumberCounter_pkey" PRIMARY KEY ("year")
);
