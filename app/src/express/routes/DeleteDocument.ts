import { NextFunction, Request, Response } from "express";
import { Joi } from "express-validation";
import { prisma } from "../../libs/prisma";

interface DTO {
  id: number;
}

export async function DeleteDocument(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const body = Joi.object({
    id: Joi.number().required(),
  });

  const validate = body.validate(req.params, { abortEarly: false });
  if (validate.error) return next(validate.error);

  const { id } = validate.value as DTO;

  const docExist = await prisma.documentType.findFirst({
    where: { id },
    select: { id: true },
  });

  if (docExist) await prisma.documentType.delete({ where: { id } });

  return res
    .status(200)
    .json({ message: "Document deleted with successfully" });
}
