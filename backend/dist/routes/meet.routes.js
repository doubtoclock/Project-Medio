"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const meet_controller_1 = require("../controller/meet.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.post("/", auth_middleware_1.authMiddleware, meet_controller_1.getMeetPoints);
router.post("/meet", auth_middleware_1.authMiddleware, meet_controller_1.getMeetPoints);
exports.default = router;
//# sourceMappingURL=meet.routes.js.map