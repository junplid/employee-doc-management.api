import { NextFunction, Request, Response } from "express";
import { Joi } from "express-validation";
import { cpf } from "cpf-cnpj-validator";
import { prisma } from "../../libs/prisma";

interface DTO {
  employeeCpf?: string;
  employeeId?: number;
}

export async function GetEmployeeDocuments(
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
  }).xor("employeeId", "employeeCpf");

  const validate = body.validate(req.query, { abortEarly: false });
  if (validate.error) return next(validate.error);

  const { employeeCpf, employeeId } = validate.value as DTO;

  const getEmployeeDocs = await prisma.employeeDocument.findMany({
    where: {
      Employee: {
        OR: [{ cpf: employeeCpf }, { id: employeeId }],
        deleted: false,
      },
    },
    select: {
      required: true,
      sent: true,
      DocumentType: { select: { name: true, id: true } },
      EmployeeDocumentFieldValues: {
        select: {
          value: true,
          DocumentField: { select: { name: true, required: true } },
        },
      },
    },
  });

  const documents = getEmployeeDocs.map((doc) => {
    const { EmployeeDocumentFieldValues, DocumentType, ...rest } = doc;

    return {
      ...rest,
      ...DocumentType,
      fieldsValue: EmployeeDocumentFieldValues.map(
        ({ DocumentField, value }) => ({ value, ...DocumentField })
      ),
    };
  });

  return res.status(200).json({ documents });
}
