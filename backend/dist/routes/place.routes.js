"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const place_controller_1 = require("../controller/place.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validation_middleware_1 = require("../middlewares/validation.middleware");
const api_validator_1 = require("../validators/api.validator");
const router = (0, express_1.Router)();
// Save place (protected)
router.post("/", auth_middleware_1.authMiddleware, (0, validation_middleware_1.validateBody)(api_validator_1.placeCreateSchema), place_controller_1.createPlace);
// Get all places of logged-in user (protected)
router.get("/", auth_middleware_1.authMiddleware, place_controller_1.getMyPlaces);
// Delete a place by ID (protected)
router.delete("/:id", auth_middleware_1.authMiddleware, (0, validation_middleware_1.validateParams)(api_validator_1.objectIdSchema), place_controller_1.deletePlace);
exports.default = router;
//# sourceMappingURL=place.routes.js.map