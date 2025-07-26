import { Request, Response, NextFunction } from "express";

export function MiddlewareErrorGlobal(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err?.isJoi) {
    return res.status(400).json({
      statusCode: 400,
      type: "validation_error",
      errors: err.details.map((detail: any) => ({
        field: detail.context.key,
        message: detail.message,
      })),
    });
  }

  if (err.status === 400) {
    return res.status(400).json({
      statusCode: 400,
      type: "bad_request",
      message: err.message || "Bad Request",
    });
  }

  return res.status(500).json({
    statusCode: 500,
    type: "internal_error",
    message: "Something went wrong",
  });
}
