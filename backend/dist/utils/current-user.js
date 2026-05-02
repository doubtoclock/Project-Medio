"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrCreateCurrentUser = void 0;
const user_1 = require("../models/user");
const getOrCreateCurrentUser = async (req) => {
    const decoded = req.user;
    if (!decoded?.userId) {
        return null;
    }
    const user = await user_1.User.findById(decoded.userId);
    return user ?? null;
};
exports.getOrCreateCurrentUser = getOrCreateCurrentUser;
//# sourceMappingURL=current-user.js.map