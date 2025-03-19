import prisma from "../infra/prisma.ts";

export const createConfigSnapshot = async (
  body: { name: string; accountId: string; active: boolean },
) => {
  const { name, accountId, active } = body;
  return await prisma.configSnapshot.create({
    data: { name, active, Creator: { connect: { id: accountId } } },
  });
};
