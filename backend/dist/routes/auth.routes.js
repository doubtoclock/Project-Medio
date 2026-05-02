"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controller/auth.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
console.log("✅ auth.routes.ts loaded");
/**
 * =========================
 * Auth Routes
 * Base path: /api/auth
 * =========================
 */
/* =========================
   TEST ROUTE
========================= */
router.get("/test", (_req, res) => {
    res.send("AUTH ROUTES WORKING");
});
/* =========================
   EMAIL / PASSWORD AUTH
========================= */
// Register
router.post("/register", auth_controller_1.register);
// Login
router.post("/login", auth_controller_1.login);
/* =========================
   GOOGLE AUTH (OAUTH)
========================= */
// STEP 1: Redirect user to Google
// Frontend hits: GET /api/auth/google
router.get("/google", auth_controller_1.googleRedirectLogin);
// STEP 2: Google redirects back here
router.get("/google/callback", auth_controller_1.googleRedirectCallback);
/* =========================
   AUTH STATUS
========================= */
// Used by frontend when page loads
router.get("/me", auth_controller_1.checkAuth);
router.get("/profile", auth_middleware_1.authMiddleware, auth_controller_1.getProfile);
router.patch("/profile", auth_middleware_1.authMiddleware, auth_controller_1.updateProfile);
/* =========================
   PROTECTED ROUTES
========================= */
// Example protected route
router.get("/protected", auth_middleware_1.authMiddleware, (req, res) => {
    res.status(200).json({
        message: "You are authenticated",
        user: req.user,
    });
});
/* =========================
   LOGOUT
========================= */
router.post("/logout", auth_controller_1.logout);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map