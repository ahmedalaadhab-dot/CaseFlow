import { Router } from "express";
import { requireAuth, requireRole } from "../../common/middleware/auth";
import { userController } from "./user.controller";

const router = Router();
router.use(requireAuth);

// Only Manager/Owner administer staff accounts and roles (Owner always
// implicitly allowed — see requireRole). Finer-grained owner-only guards
// (creating another owner, editing an owner account) live in the service.
router.get("/", requireRole("MANAGER"), userController.list);
router.get("/:id", requireRole("MANAGER"), userController.getById);
router.post("/", requireRole("MANAGER"), userController.create);
router.patch("/:id", requireRole("MANAGER"), userController.update);
router.post("/:id/reset-password", requireRole("MANAGER"), userController.resetPassword);
router.post("/:id/deactivate", requireRole("MANAGER"), userController.deactivate);
router.post("/:id/reactivate", requireRole("MANAGER"), userController.reactivate);

export default router;
