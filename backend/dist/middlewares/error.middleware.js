"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const env_1 = require("../config/env");
const errorHandler = (err, _req, res, _next) => {
    const status = typeof err?.status === "number" ? err.status : 500;
    res.status(status).json({
        message: status >= 500 ? "Internal Server Error" : err.message,
        ...(env_1.env.IS_PRODUCTION ? {} : { requestId: res.locals.requestId }),
    });
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=error.middleware.js.map