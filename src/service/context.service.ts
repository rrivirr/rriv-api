import {
  CreateContextDto,
  QueryContextDto,
  UniqueContextDto,
  UpdateContextDto,
} from "../types/context.types.ts";
import * as contextRepositoy from "../repository/context.repository.ts";
import { HttpException } from "../utils/http-exception.ts";

export const getContextById = async (requestBody: UniqueContextDto) => {
  return await contextRepositoy.getContextById(requestBody);
};

export const getContext = async (query: QueryContextDto) => {
  return await contextRepositoy.getContext(query);
};

export const createContext = async (requestBody: CreateContextDto) => {
  const { name, accountId } = requestBody;
  const existingContext = await getContext({
    name,
    accountId,
  });
  if (existingContext.length) {
    throw new HttpException(409, `'${name}' already exists`);
  }
  return await contextRepositoy.createContext(requestBody);
};

export const updateContext = async (requestBody: UpdateContextDto) => {
  const { id, name, accountId } = requestBody;
  const context = await getContextById({ contextId: id, accountId });

  if (!context) {
    throw new HttpException(404, "context not found");
  }

  if (context.endedAt) {
    const requestBodyCopy = { ...requestBody } as Partial<UpdateContextDto>;
    delete requestBodyCopy.id;
    delete requestBodyCopy.accountId;

    if (Object.values(requestBodyCopy).length) {
      throw new HttpException(
        422,
        "context cannot be updated once it has ended",
      );
    }
  }

  if (name) {
    if (name === context.name) {
      throw new HttpException(409, `context's name not changed`);
    }

    const existingContext = await getContext({
      name,
      accountId,
    });
    if (existingContext.length) {
      throw new HttpException(409, `'${name}' already exists`);
    }
  }

  return await contextRepositoy.updateContext(requestBody);
};

export const deleteContext = async (requestBody: UniqueContextDto) => {
  const { contextId } = requestBody;
  const context = await getContextById(requestBody);

  if (!context) {
    throw new HttpException(404, "context not found");
  }

  return await contextRepositoy.updateContext({
    id: contextId,
    archive: true,
    ...(!context.endedAt && { end: true }),
  });
};
