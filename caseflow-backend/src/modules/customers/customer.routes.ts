import { Router } from "express";
import { requireAuth, requireRole } from "../../common/middleware/auth";
import { customerController } from "./customer.controller";

const router = Router();

router.use(requireAuth);

// Reception, Employee, Manager, Owner can create/edit customers.
// Viewer is read-only. OWNER always allowed (see requireRole).
router.get("/", customerController.list);
router.get("/:id", customerController.getById);
router.post("/", requireRole("MANAGER", "EMPLOYEE", "RECEPTION"), customerController.create);
router.patch("/:id", requireRole("MANAGER", "EMPLOYEE", "RECEPTION"), customerController.update);
router.delete("/:id", requireRole("MANAGER"), customerController.remove);

export default router;
