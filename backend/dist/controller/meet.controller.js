"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMeetPoints = void 0;
const history_1 = require("../models/history");
const meet_services_1 = require("../services/meet.services");
const current_user_1 = require("../utils/current-user");
const logger_1 = require("../utils/logger");
const service_area_1 = require("../utils/service-area");
const getMeetPoints = async (req, res) => {
    const { latA, lonA, latB, lonB, fromName, toName } = req.body;
    const A = {
        lat: latA,
        lon: lonA,
    };
    const B = {
        lat: latB,
        lon: lonB,
    };
    try {
        if (!(0, service_area_1.isWithinServiceAreaBounds)(A) || !(0, service_area_1.isWithinServiceAreaBounds)(B)) {
            res.status(400).json({
                error: "Meeting search is available only in Mumbai and Mira Bhayandar",
            });
            return;
        }
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
        logger_1.logger.error("Meet calculation failed", { error: err });
        res.status(500).json({ error: "Meet calculation failed" });
    }
};
exports.getMeetPoints = getMeetPoints;
//# sourceMappingURL=meet.controller.js.map