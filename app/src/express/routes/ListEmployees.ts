import { NextFunction, Request, Response } from "express";
import { Joi } from "express-validation";
import { prisma } from "../../libs/prisma";

interface DTO {
  name?: string;
  docType?: string;
  limit?: number;
  page?: number;
  before?: string;
  after?: number;
  deleted?: boolean;
  pending?: boolean;
}

const querySelectEmployee = {
  id: true,
  cpf: true,
  hiredAt: true,
  createdAt: true,
  deleted: true,
  name: true,
  EmployeeDocuments: { select: { required: true, sent: true } },
};

export async function ListEmployees(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const body = Joi.object({
    name: Joi.string(),
    docType: Joi.string(),
    deleted: Joi.boolean(),
    pending: Joi.boolean(),
    limit: Joi.number(),
    page: Joi.number().min(1),
    before: Joi.number(),
    after: Joi.number(),
  });

  const validate = body.validate(req.query, { abortEarly: false });
  if (validate.error) return next(validate.error);

  const dto = validate.value as DTO;

  const limit = Math.min(Number(dto.limit) || 2, 5);
  const after = dto.after ? Number(dto.after) : undefined;
  const before = dto.before ? Number(dto.before) : undefined;
  const page = dto.page ? Math.max(1, Number(dto.page)) : undefined;

  const wherePayload = {
    deleted: dto.deleted || false,
    ...(dto.docType && {
      EmployeeDocuments: { some: { DocumentType: { name: dto.docType } } },
    }),
    ...(dto.name && { name: { contains: dto.name } }),
    ...(dto.pending !== undefined && {
      EmployeeDocuments: { some: { sent: !dto.pending, required: true } },
    }),
  };

  let queryPayload = {};
  if (page) {
    // se for uma consulta de página (não recomendado).
    Object.assign(queryPayload, {
      orderBy: { id: "asc" },
      skip: (page - 1) * limit,
      take: limit + 1,
      where: wherePayload,
    });
  } else if (before) {
    Object.assign(queryPayload, {
      orderBy: { id: "desc" },
      where: { ...wherePayload, id: { lt: before } },
      take: limit + 1,
    });
  } else {
    Object.assign(queryPayload, {
      orderBy: { id: "asc" },
      take: limit + 1,
      where: { ...wherePayload, ...(after && { id: { gt: after } }) },
    });
  }

  const list = await prisma.employee.findMany({
    ...queryPayload,
    select: querySelectEmployee,
  });

  const resolvelist = list.map(({ EmployeeDocuments, ...item }) => {
    const pending = EmployeeDocuments.some((s) => s.required && !s.sent);
    return { ...item, pending };
  });

  const hasNext = resolvelist.length > limit;
  const dataList = hasNext ? resolvelist.slice(0, -1) : resolvelist;

  const out = before ? [...dataList].reverse() : dataList;

  if (dto.page) {
    return res.json({
      list: out,
      nextCursor: hasNext ? (out.length ? out[out.length - 1].id : null) : null,
      prevCursor: list.length > limit ? (out.length ? out[0].id : null) : null,
    });
  } else if (dto.after) {
    return res.json({
      list: out,
      nextCursor: hasNext ? (out.length ? out[out.length - 1].id : null) : null,
      prevCursor: out.length ? out[0].id : null,
    });
  } else if (before) {
    return res.json({
      list: out,
      nextCursor: out.length ? out[out.length - 1].id : null,
      prevCursor: hasNext ? (out.length ? out[0].id : null) : null,
    });
  } else {
    return res.json({
      list: out,
      nextCursor: hasNext ? (out.length ? out[out.length - 1].id : null) : null,
      prevCursor: hasNext ? (out.length ? out[0].id : null) : null,
    });
  }
}
