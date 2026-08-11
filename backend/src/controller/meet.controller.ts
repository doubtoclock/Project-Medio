import { Request, Response } from "express";
import { History } from "../models/history";
import { findMeetPoints } from "../services/meet.services";
import { getOrCreateCurrentUser } from "../utils/current-user";
import { logger } from "../utils/logger";
import { isWithinServiceAreaBounds } from "../utils/service-area";
import { MeetRequestInput } from "../validators/api.validator";

export const getMeetPoints = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { latA, lonA, latB, lonB, fromName, toName } =
    res.locals.validated.body as MeetRequestInput;

  const A = {
    lat: latA,
    lon: lonA,
  };

  const B = {
    lat: latB,
    lon: lonB,
  };

  try {
    if (!isWithinServiceAreaBounds(A) || !isWithinServiceAreaBounds(B)) {
      res.status(400).json({
        error: "Meeting search is available only in Mumbai and Mira Bhayandar",
      });
      return;
    }

    const results = await findMeetPoints(A, B);

    const user = await getOrCreateCurrentUser(req);
    if (user) {
      const leftLabel = typeof fromName === "string" && fromName.trim()
        ? fromName.trim()
        : `${A.lat}, ${A.lon}`;
      const rightLabel = typeof toName === "string" && toName.trim()
        ? toName.trim()
        : `${B.lat}, ${B.lon}`;

      await History.create({
        userId: user._id,
        action: "MEET_SEARCHED",
        value: `${leftLabel} <-> ${rightLabel}`,
      });
    }

    res.json(results);
  } catch (err) {
    logger.error("Meet calculation failed", { error: err });
    res.status(500).json({ error: "Meet calculation failed" });
  }
};
