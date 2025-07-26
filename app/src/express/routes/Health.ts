import { NextFunction, Request, Response } from "express";

export function Health(_req: Request, res: Response, _next: NextFunction) {
  return res.sendStatus(200);
}
