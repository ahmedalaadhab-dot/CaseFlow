import { documentFolderRepository } from "./document-folder.repository";
import { NotFoundError, ConflictError } from "../../common/errors/AppError";

export const documentFolderService = {
  listForCase(caseId: string) {
    return documentFolderRepository.findByCaseId(caseId);
  },

  async create(caseId: string, name: string) {
    const existing = await documentFolderRepository.findByCaseIdAndName(caseId, name);
    if (existing) throw new ConflictError("A folder with this name already exists on this case");
    return documentFolderRepository.create(caseId, name);
  },

  async rename(id: string, name: string) {
    const folder = await documentFolderRepository.findById(id);
    if (!folder) throw new NotFoundError("Folder");
    const existing = await documentFolderRepository.findByCaseIdAndName(folder.caseId, name);
    if (existing && existing.id !== id) throw new ConflictError("A folder with this name already exists on this case");
    return documentFolderRepository.rename(id, name);
  },

  async remove(id: string) {
    const folder = await documentFolderRepository.findById(id);
    if (!folder) throw new NotFoundError("Folder");
    // Documents inside are not deleted — Document.folderId is set null (see schema onDelete: SetNull).
    return documentFolderRepository.remove(id);
  },
};
