import { Router } from "express";
import {
  createPlace,
  getMyPlaces,
  deletePlace
} from "../controller/place.controller";
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

// Save place (protected)
router.post("/", authMiddleware, createPlace);

// Get all places of logged-in user (protected)
router.get("/", authMiddleware, getMyPlaces);

// Delete a place by ID (protected)
router.delete("/:id", authMiddleware, deletePlace);

export default router;
