import { NextFunction, Request, Response } from "express";

export function Health(req: Request, res: Response, _next: NextFunction) {
  return res.sendStatus(200);
}
