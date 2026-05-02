"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrCreateCurrentUser = void 0;
const user_1 = require("../models/user");
const getFallbackName = (email) => {
    const [localPart] = email.split("@");
    return localPart || "Medio User";
};
const getOrCreateCurrentUser = async (req) => {
    const decoded = req.user;
    if (!decoded?.email) {
        return null;
    }
    let user = await user_1.User.findOne({ email: decoded.email });
    if (!user) {
        user = await user_1.User.create({
            email: decoded.email,
            name: decoded.name?.trim() || getFallbackName(decoded.email),
            password: "google-oauth",
            avatarUrl: decoded.picture,
        });
        return user;
    }
    let shouldSave = false;
    if (decoded.name?.trim() && user.name !== decoded.name.trim()) {
        user.name = decoded.name.trim();
        shouldSave = true;
    }
    if (decoded.picture && user.avatarUrl !== decoded.picture) {
        user.avatarUrl = decoded.picture;
        shouldSave = true;
    }
    if (shouldSave) {
        await user.save();
    }
    return user;
};
exports.getOrCreateCurrentUser = getOrCreateCurrentUser;
//# sourceMappingURL=current-user.js.map