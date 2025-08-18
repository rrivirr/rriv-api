import prisma from "../infra/prisma.ts";
import { CreateAccountDto } from "../types/account.types.ts";

export const createAccount = async (
  requestBody: CreateAccountDto & { id: string },
) => {
  const { firstName, lastName, email, phone, id } = requestBody;
  return await prisma.account.create({
    data: { id, firstName, lastName, email, phone },
  });
};

export const getAccountByEmail = async (email: string) => {
  return await prisma.account.findUnique({
    where: {
      email,
    },
  });
};
