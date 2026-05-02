"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.updateProfile = exports.getProfile = exports.checkAuth = exports.googleRedirectCallback = exports.googleRedirectLogin = exports.login = exports.register = void 0;
const google_auth_library_1 = require("google-auth-library");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const history_1 = require("../models/history");
const place_1 = require("../models/place");
const user_1 = require("../models/user");
const auth_service_1 = require("../services/auth.service");
const current_user_1 = require("../utils/current-user");
const auth_validator_1 = require("../validators/auth.validator");
const isCodespace = Boolean(process.env.CODESPACE_NAME);
const FRONTEND_URL = isCodespace
    ? `https://${process.env.CODESPACE_NAME}-5173.app.github.dev`
    : "http://localhost:5173";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;
const JWT_SECRET = process.env.JWT_SECRET;
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
    throw new Error("Google OAuth environment variables are missing");
}
const googleClient = new google_auth_library_1.OAuth2Client(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
const buildProfilePayload = async (userId) => {
    const [user, savedPlaces, recentActivity, tripsCount, activityCount] = await Promise.all([
        user_1.User.findById(userId),
        place_1.Place.find({ userId }).sort({ createdAt: -1 }),
        history_1.History.find({ userId }).sort({ createdAt: -1 }).limit(12),
        history_1.History.countDocuments({
            userId,
            action: { $in: ["ROUTE_PLANNED", "MEET_SEARCHED"] },
        }),
        history_1.History.countDocuments({ userId }),
    ]);
    if (!user) {
        return null;
    }
    const recentTrips = recentActivity.filter((item) => ["ROUTE_PLANNED", "MEET_SEARCHED"].includes(item.action));
    return {
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl || null,
            notificationsEnabled: user.notificationsEnabled,
            privacyMode: user.privacyMode,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        },
        stats: {
            tripsCount,
            savedPlacesCount: savedPlaces.length,
            activityCount,
        },
        savedPlaces,
        recentTrips,
        recentActivity,
    };
};
const register = async (req, res) => {
    try {
        const parsed = auth_validator_1.registerSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Invalid input",
                errors: parsed.error.flatten().fieldErrors,
            });
        }
        const user = await (0, auth_service_1.registerUser)(parsed.data);
        return res.status(201).json({
            message: "User registered successfully",
            data: user,
        });
    }
    catch (error) {
        return res.status(500).json({
            message: "Registration failed",
            error: error.message,
        });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required",
            });
        }
        const token = await (0, auth_service_1.loginUser)({ email, password });
        res.cookie("token", token, {
            httpOnly: true,
            sameSite: isCodespace ? "none" : "lax",
            secure: Boolean(isCodespace),
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        return res.status(200).json({
            message: "Login successful",
        });
    }
    catch {
        return res.status(401).json({
            message: "Invalid credentials",
        });
    }
};
exports.login = login;
const googleRedirectLogin = (_req, res) => {
    try {
        const url = googleClient.generateAuthUrl({
            access_type: "offline",
            scope: ["profile", "email"],
            prompt: "select_account",
            redirect_uri: GOOGLE_CALLBACK_URL,
        });
        res.redirect(url);
    }
    catch (error) {
        console.error("Google redirect error:", error);
        res.status(500).json({ message: "Failed to start Google login" });
    }
};
exports.googleRedirectLogin = googleRedirectLogin;
const googleRedirectCallback = async (req, res) => {
    try {
        const { code } = req.query;
        if (!code) {
            return res.redirect(FRONTEND_URL);
        }
        const { tokens } = await googleClient.getToken({
            code: code,
            redirect_uri: GOOGLE_CALLBACK_URL,
        });
        const ticket = await googleClient.verifyIdToken({
            idToken: tokens.id_token,
            audience: GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload?.email) {
            return res.redirect(FRONTEND_URL);
        }
        const appToken = jsonwebtoken_1.default.sign({
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
        }, JWT_SECRET, { expiresIn: "7d" });
        res.cookie("token", appToken, {
            httpOnly: true,
            sameSite: isCodespace ? "none" : "lax",
            secure: Boolean(isCodespace),
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        res.redirect(FRONTEND_URL);
    }
    catch (error) {
        console.error("Google OAuth Error:", error);
        res.redirect(FRONTEND_URL);
    }
};
exports.googleRedirectCallback = googleRedirectCallback;
const checkAuth = async (req, res) => {
    try {
        const token = req.cookies?.token;
        if (!token) {
            return res.status(200).json({
                authenticated: false,
            });
        }
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        return res.status(200).json({
            authenticated: true,
            user: {
                email: decoded.email,
                name: decoded.name || "",
                avatarUrl: decoded.picture || null,
            },
        });
    }
    catch {
        return res.status(200).json({
            authenticated: false,
        });
    }
};
exports.checkAuth = checkAuth;
const getProfile = async (req, res) => {
    try {
        const user = await (0, current_user_1.getOrCreateCurrentUser)(req);
        if (!user) {
            return res.status(401).json({
                message: "Not authenticated",
            });
        }
        const payload = await buildProfilePayload(user._id.toString());
        return res.status(200).json(payload);
    }
    catch (error) {
        console.error("Failed to load profile:", error);
        return res.status(500).json({
            message: "Failed to load profile",
        });
    }
};
exports.getProfile = getProfile;
const updateProfile = async (req, res) => {
    try {
        const user = await (0, current_user_1.getOrCreateCurrentUser)(req);
        if (!user) {
            return res.status(401).json({
                message: "Not authenticated",
            });
        }
        const { name, avatarUrl, notificationsEnabled, privacyMode, } = req.body;
        const changes = [];
        if (typeof name === "string" && name.trim()) {
            const normalizedName = name.trim();
            if (normalizedName !== user.name) {
                user.name = normalizedName;
                changes.push("name");
            }
        }
        if (avatarUrl === null || typeof avatarUrl === "string") {
            const normalizedAvatar = avatarUrl?.trim() || undefined;
            if ((user.avatarUrl || undefined) !== normalizedAvatar) {
                user.avatarUrl = normalizedAvatar;
                changes.push("avatar");
            }
        }
        if (typeof notificationsEnabled === "boolean") {
            if (user.notificationsEnabled !== notificationsEnabled) {
                user.notificationsEnabled = notificationsEnabled;
                changes.push("notifications");
            }
        }
        if (typeof privacyMode === "boolean") {
            if (user.privacyMode !== privacyMode) {
                user.privacyMode = privacyMode;
                changes.push("privacy");
            }
        }
        await user.save();
        if (changes.length > 0) {
            await history_1.History.create({
                userId: user._id,
                action: "PROFILE_UPDATED",
                value: `Updated ${changes.join(", ")}`,
            });
        }
        const payload = await buildProfilePayload(user._id.toString());
        return res.status(200).json({
            message: "Profile updated successfully",
            ...payload,
        });
    }
    catch (error) {
        console.error("Failed to update profile:", error);
        return res.status(500).json({
            message: "Failed to update profile",
        });
    }
};
exports.updateProfile = updateProfile;
const logout = (_req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        sameSite: isCodespace ? "none" : "lax",
        secure: Boolean(isCodespace),
    });
    return res.status(200).json({
        message: "Logged out successfully",
    });
};
exports.logout = logout;
//# sourceMappingURL=auth.controller.js.map