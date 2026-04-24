import { Request, Response } from "express";
import { Place } from "../models/place";          // ✅ lowercase
import { History } from "../models/history";      // ✅ recent history
import { getOrCreateCurrentUser } from "../utils/current-user";

const getUserId = async (req: Request): Promise<string | null> => {
  const user = await getOrCreateCurrentUser(req);
  if (!user) return null;

  return user._id.toString();
};

/**
 * CREATE PLACE
 * POST /places
 */
export const createPlace = async (req: Request, res: Response) => {
  try {
    const { label, address, lat, lng } = req.body;

    if (!label || !address) {
      return res.status(400).json({
        message: "Label and address are required"
      });
    }

    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({
        message: "Not authenticated - user not found"
      });
    }

    const place = await Place.create({
      userId,
      label,
      address,
      lat,
      lng
    });

    // 🕒 Auto-add to history
    await History.create({
      userId,
      action: "PLACE_CREATED",
      value: `${label} - ${address}`
    });

    return res.status(201).json({
      message: "Place saved successfully",
      place
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to save place"
    });
  }
};

/**
 * GET MY PLACES
 * GET /places
 */
export const getMyPlaces = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({
        message: "Not authenticated"
      });
    }

    const places = await Place.find({ userId }).sort({ createdAt: -1 });

    return res.json({
      count: places.length,
      places
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to fetch places"
    });
  }
};

/**
 * DELETE PLACE
 * DELETE /places/:id
 */
export const deletePlace = async (req: Request, res: Response) => {
  try {
    const userId = await getUserId(req);
    if (!userId) {
      return res.status(401).json({
        message: "Not authenticated"
      });
    }

    const placeId = req.params.id;

    const place = await Place.findOne({
      _id: placeId,
      userId
    });

    if (!place) {
      return res.status(404).json({
        message: "Place not found or not authorized"
      });
    }

    await Place.deleteOne({ _id: placeId });

    // 🕒 Auto-add to history
    await History.create({
      userId,
      action: "PLACE_DELETED",
      value: place.label
    });

    return res.json({
      message: "Place deleted successfully"
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Failed to delete place"
    });
  }
};
