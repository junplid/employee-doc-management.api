import { NextFunction, Request, Response } from "express";
import { Joi } from "express-validation";
import { cpf } from "cpf-cnpj-validator";
import moment from "moment-timezone";
import { prisma } from "../../libs/prisma";

interface DTO {
  name: string;
  cpf: string;
  hiredAt?: Date;
  docsType?: { name: string; required?: boolean; desc?: string }[];
}

export async function CreateEmployee(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const body = Joi.object({
    name: Joi.string().required(),
    cpf: Joi.string()
      .required()
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
    docsType: Joi.array()
      .items(
        Joi.object({
          name: Joi.string().required(),
          required: Joi.boolean().default(false).optional(),
          desc: Joi.string().optional(),
        })
      )
      .optional(),
  });

  const validate = body.validate(req.body, { abortEarly: false });
  if (validate.error) return next(validate.error);

  const { docsType, ...fields } = validate.value as DTO;

  const exist = await prisma.employee.findFirst({
    where: { cpf: validate.value.cpf },
  });

  if (exist) {
    return next({
      status: 400,
      message: "There is already an employee with this CPF registered",
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
    const { id } = await prisma.employee.create({
      data: {
        ...fields,
        hiredAt: fields.hiredAt || moment().toDate(),
        EmployeeDocuments: {
          createMany: {
            data: foundDocsType.map((doc) => ({
              documentTypeId: doc.id,
              desc: doc.desc,
              required: doc.required,
            })),
          },
        },
      },
      select: { id: true },
    });
    return res.status(200).json({ employee: { id } });
  } catch (error: any) {
    return next({
      status: 400,
      message: "Error, Unable to register employee",
    });
  }
}
