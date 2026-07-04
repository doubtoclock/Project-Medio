import { Router, type Request, type Response } from "express";
import { logger } from "../utils/logger";

const router = Router();

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

router.post("/interpreter", async (req: Request, res: Response) => {
  const { body } = req;

  if (typeof body !== "string" && typeof body?.query !== "string") {
    return res.status(400).json({ error: "Missing query string" });
  }

  const query = typeof body === "string" ? body : body.query;

  try {
    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: query,
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Overpass API error" });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err) {
    logger.error("Overpass proxy error", { error: err });
    return res.status(502).json({ error: "Failed to fetch nearby places" });
  }
});

export default router;
