"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
router.post("/interpreter", async (req, res) => {
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
            signal: AbortSignal.timeout(12000),
        });
        if (!response.ok) {
            return res.status(response.status).json({ error: "Overpass API error" });
        }
        const data = await response.json();
        return res.json(data);
    }
    catch (err) {
        logger_1.logger.error("Overpass proxy error", { error: err });
        return res.status(502).json({ error: "Failed to fetch nearby places" });
    }
});
exports.default = router;
//# sourceMappingURL=overpass.routes.js.map