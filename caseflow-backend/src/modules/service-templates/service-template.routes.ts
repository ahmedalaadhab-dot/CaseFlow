import { Router } from "express";
import { requireAuth, requireRole } from "../../common/middleware/auth";
import { serviceTemplateController } from "./service-template.controller";

const router = Router();
router.use(requireAuth);

router.get("/", serviceTemplateController.list);
router.get("/:id", serviceTemplateController.getById);

// Only Manager/Owner configure the workflow templates used office-wide.
router.post("/", requireRole("MANAGER"), serviceTemplateController.create);
router.patch("/:id", requireRole("MANAGER"), serviceTemplateController.update);
router.patch("/:id/active", requireRole("MANAGER"), serviceTemplateController.setActive);
router.delete("/:id", requireRole("MANAGER"), serviceTemplateController.remove);

export default router;
