import { NextFunction, Request, Response } from "express";
import { Joi } from "express-validation";
import { cpf } from "cpf-cnpj-validator";
import moment from "moment-timezone";
import { prisma } from "../../libs/prisma";

interface DTO {
  id: number;
  name?: string;
  cpf?: string;
  hiredAt?: Date;
  deleted?: boolean;
}

export async function UpdateEmployees(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const body = Joi.object({
    id: Joi.number().required(),
    name: Joi.string(),
    cpf: Joi.string()
      .custom((value, helpers) => {
        if (!cpf.isValid(value)) return helpers.error("");
        return value;
      })
      .messages({ "any.invalid": "Invalid CPF" }),
    hiredAt: Joi.string()
      .optional()
      .custom((value, helpers) => {
        const date = moment(value, "DD/MM/YYYY");
        if (!date.isValid()) return helpers.error("any.invalid");
        return date.toDate();
      })
      .messages({
        "any.invalid": "Invalid date. The field must be in DD/MM/YYYY format",
      }),
    deleted: Joi.boolean(),
  });

  const validate = body.validate(
    { ...req.body, ...req.params },
    { abortEarly: false }
  );
  if (validate.error) return next(validate.error);

  const fields = validate.value as DTO;

  const exist = await prisma.employee.findFirst({
    where: { id: fields.id },
    select: { id: true },
  });

  if (!exist) {
    return next({
      status: 400,
      message: `Employee with ID '${fields.id}' was not found`,
    });
  }

  try {
    const { id, ...data } = fields;
    const { updatedAt } = await prisma.employee.update({
      where: { id },
      data: data,
      select: { updatedAt: true },
    });
    return res.status(200).json({ updatedAt, id: fields.id });
  } catch (error: any) {
    return next({
      status: 400,
      message: "Error, Unable to update employee",
    });
  }
}
