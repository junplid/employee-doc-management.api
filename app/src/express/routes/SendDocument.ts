import { NextFunction, Request, Response } from "express";
import { Joi } from "express-validation";
import { cpf } from "cpf-cnpj-validator";
import { prisma } from "../../libs/prisma";

interface DTO {
  employeeCpf?: string;
  employeeId?: number;
  docType: {
    name: string;
    fields: Record<string, string>;
  };
}

export async function SendDocument(
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
    docType: Joi.object({
      name: Joi.string().required(),
      fields: Joi.object()
        .pattern(Joi.string(), Joi.string().trim())
        .min(1)
        .required()
        .messages({
          "object.base": "fields must be an object",
          "object.min": "provide at least one field",
          "string.base": "each field value must be a string",
        }),
    }).required(),
  }).xor("employeeId", "employeeCpf");

  const validate = body.validate(req.body, { abortEarly: false });
  if (validate.error) return next(validate.error);

  const { docType, ...wherePayload } = validate.value as DTO;

  const employee = await prisma.employee.findFirst({
    where: {
      OR: [{ cpf: wherePayload.employeeCpf }, { id: wherePayload.employeeId }],
    },
    select: { id: true },
  });

  if (!employee?.id) {
    return next({
      status: 400,
      message: `Employee with '${
        wherePayload.employeeCpf || wherePayload.employeeId
      }' was not found`,
    });
  }

  const getEmployeeDocument = await prisma.employeeDocument.findFirst({
    where: { employeeId: employee.id, DocumentType: { name: docType.name } },
    select: {
      id: true,
      DocumentType: {
        select: { DocumentField: { select: { name: true, required: true } } },
      },
    },
  });

  if (!getEmployeeDocument?.DocumentType) {
    return next({
      status: 400,
      message: `Employee document with '${docType.name}' was not found`,
    });
  }

  const schema = getEmployeeDocument.DocumentType.DocumentField;
  const documentFieldKeys = Object.keys(docType.fields);

  const schemaNames = new Set(schema.map((f) => f.name));
  const requiredNames = new Set(
    schema.filter((f) => f.required).map((f) => f.name)
  );

  const missingRequired = [...requiredNames].filter(
    (k) => !documentFieldKeys.includes(k)
  );
  const extraProvided = documentFieldKeys.filter((k) => !schemaNames.has(k));

  if (missingRequired.length || extraProvided.length) {
    const parts: string[] = [];
    if (missingRequired.length) {
      parts.push(`Missing required fields: ${missingRequired.join(", ")}`);
    }
    if (extraProvided.length) {
      parts.push(`Unknown fields provided: ${extraProvided.join(", ")}`);
    }

    return next({ status: 400, message: parts.join(" | ") });
  }

  try {
    for await (const [name, value] of Object.entries(docType.fields)) {
      const fieldDoc = await prisma.documentField.findFirst({
        where: { name },
        select: { id: true },
      });
      if (fieldDoc) {
        const pickField = await prisma.employeeDocumentFieldValue.findFirst({
          where: {
            documentFieldId: fieldDoc.id,
            employeeDocumentId: getEmployeeDocument.id,
          },
          select: { id: true },
        });
        if (pickField) {
          await prisma.employeeDocumentFieldValue.update({
            where: { id: pickField.id },
            data: { value },
          });
        } else {
          await prisma.employeeDocumentFieldValue.create({
            data: {
              value,
              documentFieldId: fieldDoc.id,
              employeeDocumentId: getEmployeeDocument.id,
            },
          });
        }
      }
    }

    await prisma.employeeDocument.update({
      where: { id: getEmployeeDocument.id },
      data: { sent: true },
    });

    return res.status(200).json({ message: "Document sent successfully" });
  } catch (error: any) {
    return next({
      status: 400,
      message: "Error, Unable to send document employee",
    });
  }
}
