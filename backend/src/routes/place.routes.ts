import { Router } from "express";
import {
  createPlace,
  getMyPlaces,
  deletePlace
} from "../controller/place.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  validateBody,
  validateParams,
} from "../middlewares/validation.middleware";
import { objectIdSchema, placeCreateSchema } from "../validators/api.validator";

const router = Router();

// Save place (protected)
router.post("/", authMiddleware, validateBody(placeCreateSchema), createPlace);

// Get all places of logged-in user (protected)
router.get("/", authMiddleware, getMyPlaces);

// Delete a place by ID (protected)
router.delete("/:id", authMiddleware, validateParams(objectIdSchema), deletePlace);

export default router;
