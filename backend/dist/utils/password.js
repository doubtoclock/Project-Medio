"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.comparePassword = exports.hashPassword = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const env_1 = require("../config/env");
const hashPassword = (password) => bcrypt_1.default.hash(password, env_1.env.BCRYPT_ROUNDS);
exports.hashPassword = hashPassword;
const comparePassword = (password, hash) => bcrypt_1.default.compare(password, hash);
exports.comparePassword = comparePassword;
//# sourceMappingURL=password.js.map