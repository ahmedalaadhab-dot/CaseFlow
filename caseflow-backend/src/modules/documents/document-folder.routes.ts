import { Router } from "express";
import { requireAuth, requireRole } from "../../common/middleware/auth";
import { documentFolderController } from "./document-folder.controller";

const router = Router();
router.use(requireAuth);

router.get("/case/:caseId", documentFolderController.listForCase);
router.post("/case/:caseId", requireRole("MANAGER", "EMPLOYEE", "RECEPTION"), documentFolderController.create);
router.patch("/:id", requireRole("MANAGER", "EMPLOYEE", "RECEPTION"), documentFolderController.rename);
router.delete("/:id", requireRole("MANAGER", "EMPLOYEE"), documentFolderController.remove);

export default router;
