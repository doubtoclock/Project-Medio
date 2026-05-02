"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const meet_controller_1 = require("../controller/meet.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validation_middleware_1 = require("../middlewares/validation.middleware");
const api_validator_1 = require("../validators/api.validator");
const router = (0, express_1.Router)();
router.post("/", auth_middleware_1.authMiddleware, (0, validation_middleware_1.validateBody)(api_validator_1.meetRequestSchema), meet_controller_1.getMeetPoints);
router.post("/meet", auth_middleware_1.authMiddleware, (0, validation_middleware_1.validateBody)(api_validator_1.meetRequestSchema), meet_controller_1.getMeetPoints);
exports.default = router;
//# sourceMappingURL=meet.routes.js.map