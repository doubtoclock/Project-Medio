import { Request, Response } from "express";
import { History } from "../models/history";
import { Place } from "../models/place";
import { getOrCreateCurrentUser } from "../utils/current-user";
import { logger } from "../utils/logger";
import { PlaceCreateInput } from "../validators/api.validator";

const getUserId = async (req: Request): Promise<string | null> => {
  const user = await getOrCreateCurrentUser(req);
  if (!user) return null;

  return user._id.toString();
};

export const createPlace = async (req: Request, res: Response) => {
  try {
    const { label, address, lat, lng } = req.body as PlaceCreateInput;

    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    const place = await Place.create({
      userId,
      label,
      address,
      lat,
      lng,
    });

    await History.create({
      userId,
      action: "PLACE_CREATED",
      value: `${label} - ${address}`,
    });

    return res.status(201).json({
      message: "Place saved successfully",
      place,
    });
  } catch (error) {
    logger.error("Failed to save place", { error });
    return res.status(500).json({
      message: "Failed to save place",
    });
  }
};

export const getMyPlaces = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    const places = await Place.find({ userId }).sort({ createdAt: -1 });

    return res.json({
      count: places.length,
      places,
    });
  } catch (error) {
    logger.error("Failed to fetch places", { error });
    return res.status(500).json({
      message: "Failed to fetch places",
    });
  }
};

export const deletePlace = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    const placeId = req.params.id;

    const place = await Place.findOne({
      _id: placeId,
      userId,
    });

    if (!place) {
      return res.status(404).json({
        message: "Place not found or not authorized",
      });
    }

    await Place.deleteOne({ _id: placeId, userId });

    await History.create({
      userId,
      action: "PLACE_DELETED",
      value: place.label,
    });

    return res.json({
      message: "Place deleted successfully",
    });
  } catch (error) {
    logger.error("Failed to delete place", { error });
    return res.status(500).json({
      message: "Failed to delete place",
    });
  }
};
