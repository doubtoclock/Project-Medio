import { Request, Response } from "express";
import { getNearbyPlaces } from "../services/osm.service";
import { calculateMidpoint } from "../utils/midpoint";
import { scorePlace } from "../utils/distance";

type Point = {
  lat: number;
  lng: number;
};

export const calculateMeetPoint = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { pointA, pointB } = req.body as {
      pointA: Point;
      pointB: Point;
    };

    // basic validation
    if (!pointA || !pointB) {
      res.status(400).json({ error: "pointA and pointB are required" });
      return;
    }

    const midpoint = calculateMidpoint(pointA, pointB);
    const places = await getNearbyPlaces(midpoint);

    const scoredPlaces = places
      .map((place) => ({
        ...place,
        score: scorePlace(place, pointA, pointB)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    res.json({
      midpoint,
      bestPlaces: scoredPlaces
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};
