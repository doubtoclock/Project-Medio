"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deletePlace = exports.getMyPlaces = exports.createPlace = void 0;
const place_1 = require("../models/place"); // ✅ lowercase
const history_1 = require("../models/history"); // ✅ recent history
const current_user_1 = require("../utils/current-user");
const getUserId = async (req) => {
    const user = await (0, current_user_1.getOrCreateCurrentUser)(req);
    if (!user)
        return null;
    return user._id.toString();
};
/**
 * CREATE PLACE
 * POST /places
 */
const createPlace = async (req, res) => {
    try {
        const { label, address, lat, lng } = req.body;
        if (!label || !address) {
            return res.status(400).json({
                message: "Label and address are required"
            });
        }
        const userId = await getUserId(req);
        if (!userId) {
            return res.status(401).json({
                message: "Not authenticated - user not found"
            });
        }
        const place = await place_1.Place.create({
            userId,
            label,
            address,
            lat,
            lng
        });
        // 🕒 Auto-add to history
        await history_1.History.create({
            userId,
            action: "PLACE_CREATED",
            value: `${label} - ${address}`
        });
        return res.status(201).json({
            message: "Place saved successfully",
            place
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to save place"
        });
    }
};
exports.createPlace = createPlace;
/**
 * GET MY PLACES
 * GET /places
 */
const getMyPlaces = async (req, res) => {
    try {
        const userId = await getUserId(req);
        if (!userId) {
            return res.status(401).json({
                message: "Not authenticated"
            });
        }
        const places = await place_1.Place.find({ userId }).sort({ createdAt: -1 });
        return res.json({
            count: places.length,
            places
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to fetch places"
        });
    }
};
exports.getMyPlaces = getMyPlaces;
/**
 * DELETE PLACE
 * DELETE /places/:id
 */
const deletePlace = async (req, res) => {
    try {
        const userId = await getUserId(req);
        if (!userId) {
            return res.status(401).json({
                message: "Not authenticated"
            });
        }
        const placeId = req.params.id;
        const place = await place_1.Place.findOne({
            _id: placeId,
            userId
        });
        if (!place) {
            return res.status(404).json({
                message: "Place not found or not authorized"
            });
        }
        await place_1.Place.deleteOne({ _id: placeId });
        // 🕒 Auto-add to history
        await history_1.History.create({
            userId,
            action: "PLACE_DELETED",
            value: place.label
        });
        return res.json({
            message: "Place deleted successfully"
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({
            message: "Failed to delete place"
        });
    }
};
exports.deletePlace = deletePlace;
//# sourceMappingURL=place.controller.js.map