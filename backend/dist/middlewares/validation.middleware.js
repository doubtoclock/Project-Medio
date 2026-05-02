"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateParams = exports.validateQuery = exports.validateBody = void 0;
const formatZodError = (error) => error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
}));
const validate = (target, schema) => (req, res, next) => {
    const parsed = schema.safeParse(req[target]);
    if (!parsed.success) {
        return res.status(400).json({
            message: "Invalid input",
            errors: formatZodError(parsed.error),
        });
    }
    req[target] = parsed.data;
    return next();
};
const validateBody = (schema) => validate("body", schema);
exports.validateBody = validateBody;
const validateQuery = (schema) => validate("query", schema);
exports.validateQuery = validateQuery;
const validateParams = (schema) => validate("params", schema);
exports.validateParams = validateParams;
//# sourceMappingURL=validation.middleware.js.map