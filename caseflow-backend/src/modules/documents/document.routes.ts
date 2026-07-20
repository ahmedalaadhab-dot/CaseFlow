import { Router } from "express";
import { requireAuth, requireRole } from "../../common/middleware/auth";
import { documentController, upload } from "./document.controller";

const router = Router();
router.use(requireAuth);

router.get("/case/:caseId", documentController.listForCase);
router.post(
  "/case/:caseId",
  requireRole("MANAGER", "EMPLOYEE", "RECEPTION"),
  upload.single("file"),
  documentController.upload
);
router.patch("/:id", requireRole("MANAGER", "EMPLOYEE", "RECEPTION"), documentController.rename);
router.delete("/:id", requireRole("MANAGER", "EMPLOYEE"), documentController.remove);

export default router;
