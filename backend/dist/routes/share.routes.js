"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const share_1 = require("../models/share");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
router.post("/", async (req, res) => {
    try {
        const { venue, originA, originB, routeDataA, routeDataB, routeErrorA, routeErrorB } = req.body;
        if (!venue || !venue.id || venue.lat == null || venue.lon == null) {
            return res.status(400).json({ error: "Venue with id, lat, and lon is required" });
        }
        const share = new share_1.Share({
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
    }
    catch (err) {
        logger_1.logger.error("Failed to create share link", { error: err });
        res.status(500).json({ error: "Failed to create share link" });
    }
});
router.get("/:shareId", async (req, res) => {
    try {
        const share = await share_1.Share.findOne({ shareId: req.params.shareId });
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
    }
    catch (err) {
        logger_1.logger.error("Failed to retrieve share data", { error: err });
        res.status(500).json({ error: "Failed to retrieve share data" });
    }
});
exports.default = router;
//# sourceMappingURL=share.routes.js.map