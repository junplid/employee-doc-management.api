import { NextFunction, Request, Response } from "express";
import { Joi } from "express-validation";
import { cpf } from "cpf-cnpj-validator";
import { prisma } from "../../libs/prisma";

interface DTO {
  employeeCpf?: string;
  employeeId?: number;
  docsType: string[];
}

export async function DetachDocument(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const body = Joi.object({
    employeeId: Joi.number().optional(),
    employeeCpf: Joi.string()
      .optional()
      .custom((value, helpers) => {
        if (!cpf.isValid(value)) return helpers.error("");
        return value;
      })
      .messages({ "any.invalid": "Invalid CPF" }),
    docsType: Joi.array().items(Joi.string()),
  }).xor("employeeId", "employeeCpf");

  const validate = body.validate(req.body, { abortEarly: false });
  if (validate.error) return next(validate.error);

  const { docsType, ...fields } = validate.value as DTO;

  const employee = await prisma.employee.findFirst({
    where: { OR: [{ cpf: fields.employeeCpf }, { id: fields.employeeId }] },
    select: { id: true },
  });

  if (!employee) {
    return next({
      status: 400,
      message: `Employee with '${
        fields.employeeCpf || fields.employeeId
      }' was not found`,
    });
  }

  try {
    await prisma.employeeDocument.deleteMany({
      where: {
        employeeId: employee.id,
        DocumentType: { name: { in: docsType } },
      },
    });
    return res.status(200).json({ message: "document successfully detached" });
  } catch (error: any) {
    return next({
      status: 400,
      message: "Error, Unable to detach documents employee",
    });
  }
}
