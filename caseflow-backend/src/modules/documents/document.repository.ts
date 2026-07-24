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
    folderId?: string;
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

  update(id: string, data: { fileName?: string; folderId?: string | null }) {
    return prisma.document.update({ where: { id }, data });
  },

  softDelete(id: string) {
    return prisma.document.update({ where: { id }, data: { deletedAt: new Date() } });
  },
};
