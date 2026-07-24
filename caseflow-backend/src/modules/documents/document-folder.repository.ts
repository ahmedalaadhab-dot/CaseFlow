import { prisma } from "../../config/prisma";

export const documentFolderRepository = {
  findByCaseId(caseId: string) {
    return prisma.documentFolder.findMany({ where: { caseId }, orderBy: { name: "asc" } });
  },

  findById(id: string) {
    return prisma.documentFolder.findUnique({ where: { id } });
  },

  findByCaseIdAndName(caseId: string, name: string) {
    return prisma.documentFolder.findFirst({ where: { caseId, name } });
  },

  create(caseId: string, name: string) {
    return prisma.documentFolder.create({ data: { caseId, name } });
  },

  rename(id: string, name: string) {
    return prisma.documentFolder.update({ where: { id }, data: { name } });
  },

  remove(id: string) {
    return prisma.documentFolder.delete({ where: { id } });
  },
};
