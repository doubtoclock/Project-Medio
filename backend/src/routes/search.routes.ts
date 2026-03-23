import { Router } from "express";

const router = Router();

router.get("/", async (req, res) => {
  const query = req.query.q as string;

  if (!query) {
    return res.status(400).json([]);
  }

  try {
    const response = await fetch(
      `https://photon.komoot.io/api?q=${encodeURIComponent(query)}&limit=5&lat=19.076&lon=72.8777`
    );

    const data = (await response.json()) as {
      features: {
        properties: { name?: string; street?: string; city?: string };
        geometry: { coordinates: [number, number] };
      }[];
    };

    const results = data.features.map((item: any) => ({
      name: item.properties.name || item.properties.street || item.properties.city,
      lat: item.geometry.coordinates[1],
      lng: item.geometry.coordinates[0],
    }));

    res.json(results);
  } catch (error) {
    console.error("Photon search error:", error);
    res.status(500).json([]);
  }
});

export default router;