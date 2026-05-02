"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireRole = exports.authMiddleware = void 0;
const jwt_1 = require("../utils/jwt");
const authMiddleware = (req, res, next) => {
    try {
        // Try cookie first, then Authorization header as fallback
        let token = req.cookies?.token;
        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader?.startsWith("Bearer ") && authHeader.length > 7) {
                token = authHeader.slice(7);
            }
        }
        if (!token) {
            return res.status(401).json({
                message: "Not authenticated",
            });
        }
        const decoded = (0, jwt_1.verifyToken)(token);
        // Attach user info to request
        req.user = decoded;
        next();
    }
    catch {
        return res.status(401).json({
            message: "Invalid or expired token",
        });
    }
};
exports.authMiddleware = authMiddleware;
const requireRole = (...roles) => (req, res, next) => {
    const user = req.user;
    if (!user || !roles.includes(user.role)) {
        return res.status(403).json({ message: "Forbidden" });
    }
    return next();
};
exports.requireRole = requireRole;
//# sourceMappingURL=auth.middleware.js.map