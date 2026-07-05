"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const share_1 = require("../models/share");
const logger_1 = require("../utils/logger");
const router = (0, express_1.Router)();
router.post("/", async (req, res) => {
    try {
        const { venue } = req.body;
        if (!venue || !venue.id || venue.lat == null || venue.lon == null) {
            return res.status(400).json({ error: "Venue with id, lat, and lon is required" });
        }
        const share = new share_1.Share({ venue });
        await share.save();
        res.json({ shareId: share.shareId });
    }
    catch (err) {
        const meta = { error: err };
        if (err instanceof Error) {
            meta.message = err.message;
            meta.name = err.name;
            meta.stack = err.stack;
            meta.fullError = JSON.stringify(err, Object.getOwnPropertyNames(err));
        }
        if (err.errors) {
            meta.validationErrors = err.errors;
        }
        try {
            meta.body = JSON.parse(JSON.stringify({ venue: req.body.venue ? { id: req.body.venue.id, name: req.body.venue.name } : undefined }));
        }
        catch { /* ignore */ }
        logger_1.logger.error("Failed to create share link", meta);
        res.status(500).json({ error: "Failed to create share link" });
    }
});
router.get("/:shareId", async (req, res) => {
    try {
        const share = await share_1.Share.findOne({ shareId: req.params.shareId });
        if (!share) {
            return res.status(404).json({ error: "Share link not found" });
        }
        res.json({ venue: share.venue });
    }
    catch (err) {
        logger_1.logger.error("Failed to retrieve share data", { error: err });
        res.status(500).json({ error: "Failed to retrieve share data" });
    }
});
exports.default = router;
//# sourceMappingURL=share.routes.js.map