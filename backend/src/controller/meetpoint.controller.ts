import { Request, Response } from "express";
import { getIsochrone } from "../services/opentripplanner.service";
import { generateGrid, findEquidistantPoints } from "../utils/grid";

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

    // Basic validation
    if (!pointA || !pointB) {
      res.status(400).json({ error: "pointA and pointB are required" });
      return;
    }

    // Fetch isochrones for both points
    const isochroneA = await getIsochrone(pointA, 30); // 30 minutes travel time
    const isochroneB = await getIsochrone(pointB, 30);

    // Generate 1km x 1km grid covering the overlapping area
    const grid = generateGrid(isochroneA, isochroneB);

    // Find equidistant points
    const equidistantPoints = findEquidistantPoints(grid, pointA, pointB);

    res.json({
      equidistantPoints,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Something went wrong" });
  }
};
