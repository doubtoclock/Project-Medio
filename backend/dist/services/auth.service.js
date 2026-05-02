"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUser = exports.registerUser = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const env_1 = require("../config/env");
const user_1 = require("../models/user");
const jwt_1 = require("../utils/jwt");
/**
 * REGISTER USER
 */
const registerUser = async (data) => {
    const { name, email, password } = data;
    // 1. Check if user already exists
    const existingUser = await user_1.User.findOne({ email });
    if (existingUser) {
        throw new Error("User already exists");
    }
    // 2. Hash password
    const hashedPassword = await bcrypt_1.default.hash(password, env_1.env.BCRYPT_ROUNDS);
    // 3. Create user
    const user = await user_1.User.create({
        name,
        email,
        password: hashedPassword,
        authProvider: "local",
        role: "user"
    });
    // 4. Return safe response (no password)
    return {
        id: user._id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
    };
};
exports.registerUser = registerUser;
/**
 * LOGIN USER
 */
const loginUser = async (data) => {
    const { email, password } = data;
    // 1. Find user
    const user = await user_1.User.findOne({ email }).select("+password");
    if (!user?.password) {
        throw new Error("Invalid email or password");
    }
    // 2. Compare password
    const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
    if (!isPasswordValid) {
        throw new Error("Invalid email or password");
    }
    // 3. Generate JWT
    return (0, jwt_1.signToken)({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        name: user.name,
        picture: user.avatarUrl,
    });
};
exports.loginUser = loginUser;
//# sourceMappingURL=auth.service.js.map