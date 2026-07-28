import { Router, type Request, type Response } from "express";
import { Share } from "../models/share";
import { logger } from "../utils/logger";

const router = Router();

router.post("/", async (req: Request, res: Response) => {
  try {
    const { venue, originA, originB, routeDataA, routeDataB, routeErrorA, routeErrorB } = req.body;

    if (!venue || !venue.id || venue.lat == null || venue.lon == null) {
      return res.status(400).json({ error: "Venue with id, lat, and lon is required" });
    }

    const share = new Share({
      venue,
      originA,
      originB,
      routeDataA,
      routeDataB,
      routeErrorA,
      routeErrorB,
    });
    await share.save();

    res.json({ shareId: share.shareId });
  } catch (err) {
    logger.error("Failed to create share link", { error: err });
    res.status(500).json({ error: "Failed to create share link" });
  }
});

router.get("/:shareId", async (req: Request, res: Response) => {
  try {
    const share = await Share.findOne({ shareId: req.params.shareId });

    if (!share) {
      return res.status(404).json({ error: "Share link not found" });
    }

    res.json({
      venue: share.venue,
      originA: share.originA,
      originB: share.originB,
      routeDataA: share.routeDataA,
      routeDataB: share.routeDataB,
      routeErrorA: share.routeErrorA,
      routeErrorB: share.routeErrorB,
    });
  } catch (err) {
    logger.error("Failed to retrieve share data", { error: err });
    res.status(500).json({ error: "Failed to retrieve share data" });
  }
});

export default router;
