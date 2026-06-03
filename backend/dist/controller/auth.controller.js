"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logout = exports.updateProfile = exports.getProfile = exports.checkAuth = exports.googleNativeSignIn = exports.googleRedirectCallback = exports.googleRedirectLogin = exports.login = exports.register = void 0;
const crypto_1 = __importDefault(require("crypto"));
const google_auth_library_1 = require("google-auth-library");
const env_1 = require("../config/env");
const history_1 = require("../models/history");
const place_1 = require("../models/place");
const user_1 = require("../models/user");
const auth_service_1 = require("../services/auth.service");
const current_user_1 = require("../utils/current-user");
const logger_1 = require("../utils/logger");
const jwt_1 = require("../utils/jwt");
const auth_validator_1 = require("../validators/auth.validator");
const AUTH_COOKIE_NAME = "token";
const OAUTH_STATE_COOKIE_NAME = "oauth_state";
const OAUTH_REDIRECT_COOKIE_NAME = "oauth_redirect";
const AUTH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const OAUTH_STATE_MAX_AGE_MS = 10 * 60 * 1000;
const googleClient = new google_auth_library_1.OAuth2Client(env_1.env.GOOGLE_CLIENT_ID, env_1.env.GOOGLE_CLIENT_SECRET);
const cookieOptions = (maxAge) => ({
    httpOnly: true,
    sameSite: env_1.env.IS_PRODUCTION || env_1.env.IS_CODESPACE ? "none" : "lax",
    secure: env_1.env.IS_PRODUCTION || env_1.env.IS_CODESPACE,
    path: "/",
    ...(maxAge ? { maxAge } : {}),
});
const getFallbackName = (email) => email.split("@")[0] || "Medio User";
const getSafeRedirectUrl = (success, token, customBase) => {
    const base = customBase || `${env_1.env.FRONTEND_URL}/login?login=${success ? "success" : "failed"}`;
    if (token)
        return `${base}&token=${encodeURIComponent(token)}`;
    return base;
};
const upsertGoogleUser = async (payload) => {
    const email = payload.email.toLowerCase();
    const name = payload.name?.trim() || getFallbackName(email);
    let user = await user_1.User.findOne({ email });
    if (!user) {
        user = await user_1.User.create({
            email,
            name,
            authProvider: "google",
            avatarUrl: payload.picture,
            role: "user",
        });
        return user;
    }
    let shouldSave = false;
    if (payload.name?.trim() && user.name !== payload.name.trim()) {
        user.name = payload.name.trim();
        shouldSave = true;
    }
    if (payload.picture && user.avatarUrl !== payload.picture) {
        user.avatarUrl = payload.picture;
        shouldSave = true;
    }
    if (shouldSave) {
        await user.save();
    }
    return user;
};
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
        if (error instanceof Error && error.message === "User already exists") {
            return res.status(409).json({
                message: "User already exists",
            });
        }
        logger_1.logger.error("Registration failed", { error });
        return res.status(500).json({
            message: "Registration failed",
        });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const parsed = auth_validator_1.loginSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Invalid input",
                errors: parsed.error.flatten().fieldErrors,
            });
        }
        const token = await (0, auth_service_1.loginUser)(parsed.data);
        res.cookie(AUTH_COOKIE_NAME, token, cookieOptions(AUTH_COOKIE_MAX_AGE_MS));
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
const googleRedirectLogin = (req, res) => {
    try {
        const state = crypto_1.default.randomBytes(32).toString("base64url");
        const redirect = typeof req.query.redirect === "string" ? req.query.redirect : "";
        res.cookie(OAUTH_STATE_COOKIE_NAME, state, cookieOptions(OAUTH_STATE_MAX_AGE_MS));
        if (redirect) {
            res.cookie(OAUTH_REDIRECT_COOKIE_NAME, redirect, cookieOptions(OAUTH_STATE_MAX_AGE_MS));
        }
        const url = googleClient.generateAuthUrl({
            access_type: "online",
            scope: ["profile", "email"],
            prompt: "select_account",
            redirect_uri: env_1.env.GOOGLE_CALLBACK_URL,
            state,
        });
        res.redirect(url);
    }
    catch (error) {
        logger_1.logger.error("Google redirect failed", { error });
        res.status(500).json({ message: "Failed to start Google login" });
    }
};
exports.googleRedirectLogin = googleRedirectLogin;
const googleRedirectCallback = async (req, res) => {
    const customRedirect = typeof req.cookies?.[OAUTH_REDIRECT_COOKIE_NAME] === "string"
        ? req.cookies[OAUTH_REDIRECT_COOKIE_NAME]
        : "";
    try {
        const code = typeof req.query.code === "string" ? req.query.code : "";
        const state = typeof req.query.state === "string" ? req.query.state : "";
        const expectedState = typeof req.cookies?.[OAUTH_STATE_COOKIE_NAME] === "string"
            ? req.cookies[OAUTH_STATE_COOKIE_NAME]
            : "";
        res.clearCookie(OAUTH_STATE_COOKIE_NAME, cookieOptions());
        res.clearCookie(OAUTH_REDIRECT_COOKIE_NAME, cookieOptions());
        if (!code || !state || !expectedState || state !== expectedState) {
            return res.redirect(getSafeRedirectUrl(false, undefined, customRedirect || undefined));
        }
        const { tokens } = await googleClient.getToken({
            code,
            redirect_uri: env_1.env.GOOGLE_CALLBACK_URL,
        });
        if (!tokens.id_token) {
            return res.redirect(getSafeRedirectUrl(false, undefined, customRedirect || undefined));
        }
        const ticket = await googleClient.verifyIdToken({
            idToken: tokens.id_token,
            audience: env_1.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload?.email) {
            return res.redirect(getSafeRedirectUrl(false, undefined, customRedirect || undefined));
        }
        const user = await upsertGoogleUser({
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
        });
        const appToken = (0, jwt_1.signToken)({
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
            name: user.name,
            picture: user.avatarUrl,
        });
        res.cookie(AUTH_COOKIE_NAME, appToken, cookieOptions(AUTH_COOKIE_MAX_AGE_MS));
        res.redirect(getSafeRedirectUrl(true, appToken, customRedirect || undefined));
    }
    catch (error) {
        logger_1.logger.error("Google OAuth callback failed", { error });
        res.redirect(getSafeRedirectUrl(false, undefined, customRedirect || undefined));
    }
};
exports.googleRedirectCallback = googleRedirectCallback;
const extractToken = (req) => {
    const fromCookie = req.cookies?.[AUTH_COOKIE_NAME];
    if (fromCookie)
        return fromCookie;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
        return authHeader.slice(7);
    }
    return null;
};
const googleNativeSignIn = async (req, res) => {
    try {
        const { idToken } = req.body;
        if (!idToken || typeof idToken !== "string") {
            return res.status(400).json({ message: "Missing idToken" });
        }
        const ticket = await googleClient.verifyIdToken({
            idToken,
            audience: env_1.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload?.email) {
            return res.status(400).json({ message: "Invalid token" });
        }
        const user = await upsertGoogleUser({
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
        });
        const appToken = (0, jwt_1.signToken)({
            userId: user._id.toString(),
            email: user.email,
            role: user.role,
            name: user.name,
            picture: user.avatarUrl,
        });
        return res.status(200).json({
            token: appToken,
            user: {
                id: user._id,
                email: user.email,
                name: user.name,
                avatarUrl: user.avatarUrl,
                role: user.role,
            },
        });
    }
    catch (error) {
        logger_1.logger.error("Google native sign-in failed", { error });
        return res.status(401).json({ message: "Google sign-in failed" });
    }
};
exports.googleNativeSignIn = googleNativeSignIn;
const checkAuth = async (req, res) => {
    try {
        const token = extractToken(req);
        if (!token) {
            return res.status(200).json({
                authenticated: false,
            });
        }
        const decoded = (0, jwt_1.verifyToken)(token);
        return res.status(200).json({
            authenticated: true,
            user: {
                id: decoded.userId,
                email: decoded.email,
                name: decoded.name || "",
                avatarUrl: decoded.picture || null,
                role: decoded.role,
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
        logger_1.logger.error("Failed to load profile", { error });
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
        const parsed = auth_validator_1.updateProfileSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Invalid input",
                errors: parsed.error.flatten().fieldErrors,
            });
        }
        const { name, avatarUrl, notificationsEnabled, privacyMode } = parsed.data;
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
        logger_1.logger.error("Failed to update profile", { error });
        return res.status(500).json({
            message: "Failed to update profile",
        });
    }
};
exports.updateProfile = updateProfile;
const logout = (_req, res) => {
    res.clearCookie(AUTH_COOKIE_NAME, cookieOptions());
    res.clearCookie(OAUTH_STATE_COOKIE_NAME, cookieOptions());
    res.clearCookie(OAUTH_REDIRECT_COOKIE_NAME, cookieOptions());
    return res.status(200).json({
        message: "Logged out successfully",
    });
};
exports.logout = logout;
//# sourceMappingURL=auth.controller.js.map