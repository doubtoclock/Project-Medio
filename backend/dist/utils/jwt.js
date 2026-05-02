"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.signToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const signToken = (user) => {
    const payload = {
        email: user.email,
        role: user.role,
        name: user.name,
        picture: user.picture,
    };
    return jsonwebtoken_1.default.sign(payload, env_1.env.JWT_SECRET, {
        algorithm: "HS256",
        audience: env_1.env.JWT_AUDIENCE,
        expiresIn: env_1.env.JWT_EXPIRES_IN,
        issuer: env_1.env.JWT_ISSUER,
        subject: user.userId,
    });
};
exports.signToken = signToken;
const verifyToken = (token) => {
    const decoded = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET, {
        algorithms: ["HS256"],
        audience: env_1.env.JWT_AUDIENCE,
        issuer: env_1.env.JWT_ISSUER,
    });
    if (typeof decoded.sub !== "string" ||
        typeof decoded.email !== "string" ||
        (decoded.role !== "user" && decoded.role !== "admin")) {
        throw new Error("Invalid token payload");
    }
    return {
        userId: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        name: typeof decoded.name === "string" ? decoded.name : undefined,
        picture: typeof decoded.picture === "string" ? decoded.picture : undefined,
    };
};
exports.verifyToken = verifyToken;
//# sourceMappingURL=jwt.js.map