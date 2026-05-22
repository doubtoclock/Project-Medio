import { NextFunction, Request, Response } from "express";
import { z } from "zod";

const formatZodError = (error: z.ZodError) =>
  error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));

const validate =
  (target: "body" | "query" | "params", schema: z.ZodTypeAny) =>
  (req: Request, res: Response, next: NextFunction) => {
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
    if (!res.locals.validated) res.locals.validated = {} as any;
    res.locals.validated[target] = parsed.data;
    return next();
  };

export const validateBody = (schema: z.ZodTypeAny) => validate("body", schema);
export const validateQuery = (schema: z.ZodTypeAny) =>
  validate("query", schema);
export const validateParams = (schema: z.ZodTypeAny) =>
  validate("params", schema);
