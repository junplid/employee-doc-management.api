import { NextFunction, Request, Response } from "express";
import { prisma } from "../../libs/prisma";
import { Joi } from "express-validation";

interface DTO {
  limit?: number;
  page?: number;
  before?: string;
  after?: number;
}

const querySelectEmployee = {
  id: true,
  name: true,
  DocumentField: { select: { name: true, required: true } },
};

export async function ListDocumentsType(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const body = Joi.object({
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

  let queryPayload = {};
  if (page) {
    // se for uma consulta de página (não recomendado).
    Object.assign(queryPayload, {
      orderBy: { id: "asc" },
      skip: (page - 1) * limit,
      take: limit + 1,
    });
  } else if (before) {
    Object.assign(queryPayload, {
      orderBy: { id: "desc" },
      where: { id: { lt: before } },
      take: limit + 1,
    });
  } else {
    Object.assign(queryPayload, {
      orderBy: { id: "asc" },
      take: limit + 1,
      where: { ...(after && { id: { gt: after } }) },
    });
  }

  const list = await prisma.documentType.findMany({
    ...queryPayload,
    select: querySelectEmployee,
  });

  let resolvelist = list.map(({ DocumentField, ...item }) => {
    return { ...item, fields: DocumentField.map((field) => field) };
  });
  const hasNext = resolvelist.length > limit;
  resolvelist = hasNext ? resolvelist.slice(0, -1) : resolvelist;

  const out = before ? [...resolvelist].reverse() : resolvelist;

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
