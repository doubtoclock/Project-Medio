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
    // Some properties on the underlying IncomingMessage (which Express's
    // Request extends) can be getter-only at runtime, causing a TypeError
    // when assigning (see: "which has only a getter"). Instead of
    // overwriting `req` properties, store validated values on `res.locals`.
    // Downstream handlers can read validated inputs from `res.locals.validated`.
    if (!res.locals.validated)
        res.locals.validated = {};
    res.locals.validated[target] = parsed.data;
    return next();
};
const validateBody = (schema) => validate("body", schema);
exports.validateBody = validateBody;
const validateQuery = (schema) => validate("query", schema);
exports.validateQuery = validateQuery;
const validateParams = (schema) => validate("params", schema);
exports.validateParams = validateParams;
//# sourceMappingURL=validation.middleware.js.map