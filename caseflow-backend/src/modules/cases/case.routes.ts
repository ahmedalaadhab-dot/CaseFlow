import { Router } from "express";
import { requireAuth, requireRole } from "../../common/middleware/auth";
import { caseController } from "./case.controller";

const router = Router();

router.use(requireAuth);

router.get("/", caseController.list);
router.get("/:id", caseController.getById);

router.post("/", requireRole("MANAGER", "EMPLOYEE", "RECEPTION"), caseController.create);
router.patch("/:id", requireRole("MANAGER", "EMPLOYEE"), caseController.update);
router.delete("/:id", requireRole("MANAGER"), caseController.remove);

router.post("/:id/advance-stage", requireRole("MANAGER", "EMPLOYEE"), caseController.advanceStage);
router.patch("/:id/checklist/:itemId", requireRole("MANAGER", "EMPLOYEE", "RECEPTION"), caseController.toggleChecklistItem);

router.post("/:id/archive", requireRole("MANAGER", "EMPLOYEE"), caseController.archive);
router.post("/:id/restore", requireRole("MANAGER"), caseController.restore);

export default router;
