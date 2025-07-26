import { NextFunction, Request, Response } from "express";
import { Joi } from "express-validation";
import { cpf } from "cpf-cnpj-validator";
import { prisma } from "../../libs/prisma";

interface DTO {
  employeeCpf?: string;
  employeeId?: number;
  docsType: { name: string; required?: boolean; desc?: string }[];
}

export async function AttachDocument(
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
    docsType: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().required(),
          required: Joi.boolean().default(false).optional(),
          desc: Joi.string().optional(),
        })
      )
      .required(),
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

  let foundDocsType: { required?: boolean; id: number; desc?: string }[] = [];
  if (docsType?.length) {
    const nameTypes = docsType.map((d) => d.name);
    const docsExists = await prisma.documentType.findMany({
      where: { name: { in: nameTypes } },
      select: { id: true, name: true },
    });

    if (docsExists.length !== docsType.length) {
      const foundSet = new Set(docsExists.map((d) => d.name));
      const missingDocs = nameTypes
        .filter((name) => !foundSet.has(name))
        .join(", ");

      return next({
        status: 400,
        message: `Some of the provided document types were not found. Missing documents: ${missingDocs}`,
      });
    }
    foundDocsType = docsExists.map((doc) => ({
      id: doc.id,
      required: docsType.find((d) => d.name === doc.name)?.required,
      desc: docsType.find((d) => d.name === doc.name)?.desc,
    }));
  }

  try {
    for await (const doc of foundDocsType) {
      const attachExists = await prisma.employeeDocument.findFirst({
        where: { documentTypeId: doc.id, employeeId: employee.id },
        select: { id: true },
      });
      if (!attachExists?.id) {
        await prisma.employeeDocument.create({
          data: {
            documentTypeId: doc.id,
            desc: doc.desc,
            required: doc.required,
            employeeId: employee.id,
          },
        });
      }
    }
    return res.status(200).json({ message: "documents attached successfully" });
  } catch (error: any) {
    return next({
      status: 400,
      message: "Error, Unable to attach documents employee",
    });
  }
}
