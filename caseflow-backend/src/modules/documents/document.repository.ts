import { prisma } from "../../config/prisma";

export const documentRepository = {
  findByCaseId(caseId: string) {
    return prisma.document.findMany({ where: { caseId, deletedAt: null }, orderBy: { createdAt: "desc" } });
  },

  findById(id: string) {
    return prisma.document.findFirst({ where: { id, deletedAt: null } });
  },

  findLatestVersionInCategory(caseId: string, category: string, fileName: string) {
    return prisma.document.findFirst({
      where: { caseId, category: category as any, fileName, deletedAt: null },
      orderBy: { version: "desc" },
    });
  },

  create(data: {
    caseId: string;
    category: string;
    fileName: string;
    storageKey: string;
    mimeType: string;
    sizeBytes: number;
    uploadedByUserId: string;
    version: number;
    replacesId?: string;
  }) {
    return prisma.document.create({ data: data as any });
  },

  rename(id: string, fileName: string) {
    return prisma.document.update({ where: { id }, data: { fileName } });
  },

  softDelete(id: string) {
    return prisma.document.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};
