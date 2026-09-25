import { fromPrisma } from "npm:pg-boss";
import { Prisma } from "generated/browser.ts";
import authServiceAxios from "../infra/axios/auth-service.ts";
import {
  ListObjectDto,
  Tuple,
  WriteRelationshipDto,
} from "../types/auth-service.types.ts";
import { sendMessage } from "../infra/pg-boss/pg-boss.ts";
import { QUEUE_NAME, TYPES } from "../infra/pg-boss/constants.ts";
import { HttpException } from "../utils/http-exception.ts";

export const SYSTEM = "system:rriv";

export const authorizationCheck = async (body: Tuple) => {
  const response = await authServiceAxios.post("/check", body);
  const allowed = response.data.allowed;
  if (!allowed) {
    throw new HttpException(403, "access to resource denied");
  }
};

export const read = async (
  body: { user?: string; relation?: string; object?: string },
): Promise<Tuple[]> => {
  const response = await authServiceAxios.post("/read", body);
  const tuples = response.data.tuples.map((
    { key: { user, relation, object } }: { key: Tuple; timestamp: string },
  ) => ({ user, relation, object }));
  return tuples;
};

export const listObjects = async (
  body: ListObjectDto,
): Promise<string[]> => {
  const response = await authServiceAxios.post("/list-objects", body);
  const objects = response.data.objects;
  return objects.map((o: string) => o.split(":")[1]);
};

export const listUsers = async (
  body: { userType: string; id: string; objectType: string; relation: string },
): Promise<{ object: { type: string; id: string } }[]> => {
  const response = await authServiceAxios.post("/list-users", body);
  const users = response.data.users;
  return users;
};

export const writeRelationships = async (
  body: WriteRelationshipDto & {
    trx?: Prisma.TransactionClient;
    singletonKey: string;
  },
) => {
  const { writes = [], deletes = [], trx, singletonKey } = body;

  await sendMessage(QUEUE_NAME, {
    type: TYPES.AUTH_SERVICE_WRITE,
    payload: {
      writes,
      deletes,
    },
  }, { singletonKey, ...(trx && { db: fromPrisma(trx) }) });
};
