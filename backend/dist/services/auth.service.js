"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUser = exports.registerUser = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const user_1 = require("../models/user");
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables");
}
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
    const hashedPassword = await bcrypt_1.default.hash(password, 10);
    // 3. Create user
    const user = await user_1.User.create({
        name,
        email,
        password: hashedPassword
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
    const user = await user_1.User.findOne({ email });
    if (!user) {
        throw new Error("Invalid email or password");
    }
    // 2. Compare password
    const isPasswordValid = await bcrypt_1.default.compare(password, user.password);
    if (!isPasswordValid) {
        throw new Error("Invalid email or password");
    }
    // 3. Generate JWT
    const token = jsonwebtoken_1.default.sign({
        userId: user._id,
        email: user.email
    }, JWT_SECRET, {
        expiresIn: "7d"
    });
    return token;
};
exports.loginUser = loginUser;
//# sourceMappingURL=auth.service.js.map