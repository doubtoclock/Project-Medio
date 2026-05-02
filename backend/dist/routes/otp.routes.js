"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
router.post("/route", async (req, res) => {
    const { from, to } = req.body;
    if (!from || !to) {
        return res.status(400).json({ message: "Missing coordinates" });
    }
    try {
        const graphqlQuery = {
            query: `
      {
        plan(
          from: { lat: ${from.lat}, lon: ${from.lng} }
          to: { lat: ${to.lat}, lon: ${to.lng} }
          transportModes: [
            { mode: WALK },
            { mode: TRANSIT }
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
        };
        const response = await fetch("http://localhost:8080/otp/routers/default/index/graphql", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(graphqlQuery),
        });
        const data = await response.json();
        res.json(data);
    }
    catch (error) {
        console.error("OTP GraphQL error:", error);
        res.status(500).json({ message: "OTP routing failed" });
    }
});
exports.default = router;
//# sourceMappingURL=otp.routes.js.map