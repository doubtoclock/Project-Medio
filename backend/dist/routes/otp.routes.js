"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const env_1 = require("../config/env");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const validation_middleware_1 = require("../middlewares/validation.middleware");
const logger_1 = require("../utils/logger");
const api_validator_1 = require("../validators/api.validator");
const router = (0, express_1.Router)();
router.post("/route", auth_middleware_1.authMiddleware, (0, validation_middleware_1.validateBody)(api_validator_1.routeRequestSchema), async (req, res) => {
    const { from, to } = req.body;
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
        const response = await fetch(env_1.env.OTP_GRAPHQL_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(graphqlQuery),
        });
        const data = await response.json();
        res.json(data);
    }
    catch (error) {
        logger_1.logger.error("OTP GraphQL route failed", { error });
        res.status(500).json({ message: "OTP routing failed" });
    }
});
exports.default = router;
//# sourceMappingURL=otp.routes.js.map