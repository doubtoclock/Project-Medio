import { Request, Response } from "express";
import { findMeetPoints } from "../services/meet.services";

export const getMeetPoints = async (
  req: Request,
  res: Response
): Promise<void> => {

  const { latA, lonA, latB, lonB, minutes } = req.body;

  // Validate inputs
  if (
    latA === undefined ||
    lonA === undefined ||
    latB === undefined ||
    lonB === undefined
  ) {
    res.status(400).json({ error: "latA, lonA, latB, lonB are required" });
    return;
  }

  const A = {
    lat: Number(latA),
    lon: Number(lonA),
  };

  const B = {
    lat: Number(latB),
    lon: Number(lonB),
  };

  if (
    Number.isNaN(A.lat) ||
    Number.isNaN(A.lon) ||
    Number.isNaN(B.lat) ||
    Number.isNaN(B.lon)
  ) {
    res.status(400).json({ error: "Invalid coordinate values" });
    return;
  }

  try {
    const results = await findMeetPoints(
      A,
      B,
      minutes ? Number(minutes) : 20
    );

    res.json(results);
  } catch (err) {
    console.error("Meet calculation error:", err);
    res.status(500).json({ error: "Meet calculation failed" });
  }
};
