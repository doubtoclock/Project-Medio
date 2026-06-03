"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controller/auth.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const security_middleware_1 = require("../middlewares/security.middleware");
const validation_middleware_1 = require("../middlewares/validation.middleware");
const auth_validator_1 = require("../validators/auth.validator");
const router = (0, express_1.Router)();
router.post("/register", security_middleware_1.authRateLimiter, (0, validation_middleware_1.validateBody)(auth_validator_1.registerSchema), auth_controller_1.register);
router.post("/login", security_middleware_1.authRateLimiter, (0, validation_middleware_1.validateBody)(auth_validator_1.loginSchema), auth_controller_1.login);
router.get("/google", security_middleware_1.authRateLimiter, auth_controller_1.googleRedirectLogin);
router.get("/google/callback", security_middleware_1.authRateLimiter, auth_controller_1.googleRedirectCallback);
router.post("/google/native", auth_controller_1.googleNativeSignIn);
router.get("/me", auth_controller_1.checkAuth);
router.get("/profile", auth_middleware_1.authMiddleware, auth_controller_1.getProfile);
router.patch("/profile", auth_middleware_1.authMiddleware, (0, validation_middleware_1.validateBody)(auth_validator_1.updateProfileSchema), auth_controller_1.updateProfile);
router.get("/protected", auth_middleware_1.authMiddleware, (req, res) => {
    const user = req.user;
    res.status(200).json({
        message: "You are authenticated",
        user: {
            id: user.userId,
            email: user.email,
            role: user.role,
        },
    });
});
router.post("/logout", auth_controller_1.logout);
exports.default = router;
//# sourceMappingURL=auth.routes.js.map