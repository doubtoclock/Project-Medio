"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMeetPoints = void 0;
const history_1 = require("../models/history");
const meet_services_1 = require("../services/meet.services");
const current_user_1 = require("../utils/current-user");
const getMeetPoints = async (req, res) => {
    const { latA, lonA, latB, lonB, minutes, fromName, toName } = req.body;
    if (latA === undefined ||
        lonA === undefined ||
        latB === undefined ||
        lonB === undefined) {
        res.status(400).json({ error: "latA, lonA, latB, lonB are required" });
        return;
    }
    const A = {
        lat: Number(latA),
        lon: Number(lonA),
    };
    const B = {
        lat: Number(latB),
        lon: Number(lonB),
    };
    if (Number.isNaN(A.lat) ||
        Number.isNaN(A.lon) ||
        Number.isNaN(B.lat) ||
        Number.isNaN(B.lon)) {
        res.status(400).json({ error: "Invalid coordinate values" });
        return;
    }
    try {
        const results = await (0, meet_services_1.findMeetPoints)(A, B);
        const user = await (0, current_user_1.getOrCreateCurrentUser)(req);
        if (user) {
            const leftLabel = typeof fromName === "string" && fromName.trim()
                ? fromName.trim()
                : `${A.lat}, ${A.lon}`;
            const rightLabel = typeof toName === "string" && toName.trim()
                ? toName.trim()
                : `${B.lat}, ${B.lon}`;
            await history_1.History.create({
                userId: user._id,
                action: "MEET_SEARCHED",
                value: `${leftLabel} <-> ${rightLabel}`,
            });
        }
        res.json(results);
    }
    catch (err) {
        console.error("Meet calculation error:", err);
        res.status(500).json({ error: "Meet calculation failed" });
    }
};
exports.getMeetPoints = getMeetPoints;
//# sourceMappingURL=meet.controller.js.map