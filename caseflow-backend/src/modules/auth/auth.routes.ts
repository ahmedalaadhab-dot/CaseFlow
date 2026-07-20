import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authController } from "./auth.controller";
import { requireAuth } from "../../common/middleware/auth";

const router = Router();

// Tighter limit on auth endpoints specifically, to slow down credential
// stuffing / brute force beyond the app-wide rate limiter in app.ts.
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

router.post("/login", authLimiter, authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);
router.post("/forgot-password", authLimiter, authController.forgotPassword);
router.post("/reset-password", authLimiter, authController.resetPassword);
router.get("/me", requireAuth, authController.me);
router.patch("/me", requireAuth, authController.updateMe);
router.post("/change-password", requireAuth, authLimiter, authController.changePassword);

export default router;
