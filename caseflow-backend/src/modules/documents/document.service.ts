import { storage } from "../../common/storage";
import { documentRepository } from "./document.repository";
import { caseRepository } from "../cases/case.repository";
import { NotFoundError, ValidationError } from "../../common/errors/AppError";

const ACCEPTED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
]);

export const documentService = {
  async upload(params: {
    caseId: string;
    category: string;
    folderId?: string;
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    uploadedByUserId: string;
  }) {
    if (!ACCEPTED_MIME_TYPES.has(params.mimeType)) {
      throw new ValidationError({ mimeType: params.mimeType }, "Unsupported file type. Accepted: PDF, JPG, PNG, DOCX");
    }

    const storageKey = await storage.save({
      buffer: params.buffer,
      originalName: params.originalName,
      folder: params.caseId,
    });

    // If a document with the same file name already exists in this case,
    // treat the upload as a new version rather than an unrelated file.
    const previous = await documentRepository.findLatestVersionInCategory(params.caseId, params.category, params.originalName);

    const created = await documentRepository.create({
      caseId: params.caseId,
      category: params.category,
      folderId: params.folderId,
      fileName: params.originalName,
      storageKey,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
      uploadedByUserId: params.uploadedByUserId,
      version: previous ? previous.version + 1 : 1,
      replacesId: previous?.id,
    });

    await caseRepository.addTimelineEvent({
      caseId: params.caseId,
      actorId: params.uploadedByUserId,
      type: "DOCUMENT_UPLOADED",
      message: `Uploaded ${params.originalName}${previous ? ` (v${created.version})` : ""}`,
    });

    return { ...created, url: await storage.getUrl(storageKey) };
  },

  async listForCase(caseId: string) {
    const docs = await documentRepository.findByCaseId(caseId);
    return Promise.all(docs.map(async (d) => ({ ...d, url: await storage.getUrl(d.storageKey) })));
  },

  async update(id: string, data: { fileName?: string; folderId?: string | null }) {
    const doc = await documentRepository.findById(id);
    if (!doc) throw new NotFoundError("Document");
    return documentRepository.update(id, data);
  },

  async remove(id: string, actorId: string) {
    const doc = await documentRepository.findById(id);
    if (!doc) throw new NotFoundError("Document");
    await documentRepository.softDelete(id);
    await storage.delete(doc.storageKey);
    await caseRepository.addTimelineEvent({
      caseId: doc.caseId,
      actorId,
      type: "DOCUMENT_DELETED",
      message: `Deleted ${doc.fileName}`,
    });
  },
};
