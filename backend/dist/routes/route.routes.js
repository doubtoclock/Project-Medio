"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const route_controller_1 = require("../controller/route.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validation_middleware_1 = require("../middlewares/validation.middleware");
const api_validator_1 = require("../validators/api.validator");
const router = express_1.default.Router();
router.post("/route", auth_middleware_1.authMiddleware, (0, validation_middleware_1.validateBody)(api_validator_1.routeRequestSchema), route_controller_1.getRouteFromOTP);
exports.default = router;
//# sourceMappingURL=route.routes.js.map