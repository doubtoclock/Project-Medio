import { Router } from "express";

const router = Router();

router.get("/", async (req, res) => {
  const query = req.query.q as string;

  if (!query) {
    return res.status(400).json([]);
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    query
  )}&limit=5&viewbox=72.77,19.27,72.99,18.89&bounded=1`,
      {
        headers: {
          "User-Agent": "medio-app",
        },
      }
    );

    const data = (await response.json()) as Array<any>;

    const results = data.map((item: any) => ({
      name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));

    res.json(results);
  } catch (error) {
    console.error("OSM search error:", error);
    res.status(500).json([]);
  }
});

export default router;