import { Router } from "express";
import { env } from "../config/env";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validateBody } from "../middlewares/validation.middleware";
import { logger } from "../utils/logger";
import { routeRequestSchema, RouteRequestInput } from "../validators/api.validator";

const router = Router();

router.post(
  "/route",
  authMiddleware,
  validateBody(routeRequestSchema),
  async (req, res) => {
    const { from, to } = req.body as RouteRequestInput;

    try {
      const graphqlQuery = {
        query: `
          query Plan($fromLat: Float!, $fromLon: Float!, $toLat: Float!, $toLon: Float!) {
            plan(
              from: { lat: $fromLat, lon: $fromLon }
              to: { lat: $toLat, lon: $toLon }
              transportModes: [
                { mode: WALK },
                { mode: RAIL },
                { mode: SUBWAY },
                { mode: BUS }
              ]
              numItineraries: 3
            ) {
              itineraries {
                duration
                startTime
                endTime
                legs {
                  mode
                  distance
                  startTime
                  endTime
                  from { name }
                  to { name }
                }
              }
            }
          }
        `,
        variables: {
          fromLat: from.lat,
          fromLon: from.lng,
          toLat: to.lat,
          toLon: to.lng,
        },
      };

      const response = await fetch(env.OTP_GRAPHQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(graphqlQuery),
      });

      const data = await response.json();

      res.json(data);
    } catch (error) {
      logger.error("OTP GraphQL route failed", { error });
      res.status(500).json({ message: "OTP routing failed" });
    }
  }
);

export default router;
