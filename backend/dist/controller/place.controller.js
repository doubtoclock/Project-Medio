"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePlace = exports.getMyPlaces = exports.createPlace = void 0;
const history_1 = require("../models/history");
const place_1 = require("../models/place");
const current_user_1 = require("../utils/current-user");
const logger_1 = require("../utils/logger");
const getUserId = async (req) => {
    const user = await (0, current_user_1.getOrCreateCurrentUser)(req);
    if (!user)
        return null;
    return user._id.toString();
};
const createPlace = async (req, res) => {
    try {
        const { label, address, lat, lng } = req.body;
        const userId = await getUserId(req);
        if (!userId) {
            return res.status(401).json({
                message: "Not authenticated",
            });
        }
        const place = await place_1.Place.create({
            userId,
            label,
            address,
            lat,
            lng,
        });
        await history_1.History.create({
            userId,
            action: "PLACE_CREATED",
            value: `${label} - ${address}`,
        });
        return res.status(201).json({
            message: "Place saved successfully",
            place,
        });
    }
    catch (error) {
        logger_1.logger.error("Failed to save place", { error });
        return res.status(500).json({
            message: "Failed to save place",
        });
    }
};
exports.createPlace = createPlace;
const getMyPlaces = async (req, res) => {
    try {
        const userId = await getUserId(req);
        if (!userId) {
            return res.status(401).json({
                message: "Not authenticated",
            });
        }
        const places = await place_1.Place.find({ userId }).sort({ createdAt: -1 });
        return res.json({
            count: places.length,
            places,
        });
    }
    catch (error) {
        logger_1.logger.error("Failed to fetch places", { error });
        return res.status(500).json({
            message: "Failed to fetch places",
        });
    }
};
exports.getMyPlaces = getMyPlaces;
const deletePlace = async (req, res) => {
    try {
        const userId = await getUserId(req);
        if (!userId) {
            return res.status(401).json({
                message: "Not authenticated",
            });
        }
        const placeId = req.params.id;
        const place = await place_1.Place.findOne({
            _id: placeId,
            userId,
        });
        if (!place) {
            return res.status(404).json({
                message: "Place not found or not authorized",
            });
        }
        await place_1.Place.deleteOne({ _id: placeId, userId });
        await history_1.History.create({
            userId,
            action: "PLACE_DELETED",
            value: place.label,
        });
        return res.json({
            message: "Place deleted successfully",
        });
    }
    catch (error) {
        logger_1.logger.error("Failed to delete place", { error });
        return res.status(500).json({
            message: "Failed to delete place",
        });
    }
};
exports.deletePlace = deletePlace;
//# sourceMappingURL=place.controller.js.map