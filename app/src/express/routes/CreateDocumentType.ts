import { NextFunction, Request, Response } from "express";
import { Joi } from "express-validation";
import { prisma } from "../../libs/prisma";

interface DTO {
  name: string;
  fields?: { name: string; required?: boolean }[];
}

export async function CreateDocumentType(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const body = Joi.object({
    name: Joi.string().required(),
    fields: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().required(),
          required: Joi.boolean().optional(),
        })
      )
      .optional(),
  });

  const validate = body.validate(req.body, { abortEarly: false });
  if (validate.error) return next(validate.error);

  const { fields, name } = validate.value as DTO;

  const exist = await prisma.documentType.findFirst({
    where: { name },
    select: { id: true },
  });

  if (exist) {
    return next({
      status: 400,
      message: "There is already an Document with this name registered",
    });
  }

  try {
    const { id } = await prisma.documentType.create({
      data: {
        name,
        ...(fields?.length && {
          DocumentField: { createMany: { data: fields } },
        }),
      },
      select: { id: true },
    });
    return res.status(200).json({ document: { id } });
  } catch (error: any) {
    return next({
      status: 400,
      message: "Error, Unable to register document",
    });
  }
}
