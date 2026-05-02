import { Request, Response, NextFunction } from "express";
import { env } from "../config/env";

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const status = typeof err?.status === "number" ? err.status : 500;

  res.status(status).json({
    message: status >= 500 ? "Internal Server Error" : err.message,
    ...(env.IS_PRODUCTION ? {} : { requestId: res.locals.requestId }),
  });
};
