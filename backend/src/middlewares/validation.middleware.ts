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

    req[target] = parsed.data;
    return next();
  };

export const validateBody = (schema: z.ZodTypeAny) => validate("body", schema);
export const validateQuery = (schema: z.ZodTypeAny) =>
  validate("query", schema);
export const validateParams = (schema: z.ZodTypeAny) =>
  validate("params", schema);
