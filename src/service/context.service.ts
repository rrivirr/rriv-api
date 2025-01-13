"use strict";
import {
  CreateContextDto,
  QueryContextDto,
  UpdateContextDto,
} from "../handler/context/schema.ts";
import * as contextRepositoy from "../repository/context.repository.ts";
import { HttpException } from "../utils/http-exception.ts";

export const getContext = async (query: QueryContextDto) => {
  return await contextRepositoy.getContext(query);
};

export const getContextById = async (id: string, accountId: string) => {
  const context = await contextRepositoy.getContextById(id, accountId);

  if (!context || context.archivedAt) {
    return null;
  }

  return context;
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
  const modifiedRequestBody = { ...requestBody };
  const context = await getContextById(id, accountId);

  if (!context) {
    throw new HttpException(404, "context not found");
  }

  if (context.endedAt) {
    const requestBodyCopy = { ...requestBody } as Partial<UpdateContextDto>;
    delete requestBodyCopy.id;
    delete requestBodyCopy.accountId;
    delete requestBodyCopy.archive;

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

  if (requestBody.archive && !requestBody.end && !context.endedAt) {
    modifiedRequestBody.end = true;
  }
  return await contextRepositoy.updateContext(modifiedRequestBody);
};
