import authServiceAxios from "../infra/axios/auth-service.ts";
import {
  ListObjectDto,
  Tuple,
  WriteRelationshipDto,
} from "../types/auth-service.types.ts";
import { HttpException } from "../utils/http-exception.ts";

export const SYSTEM = "system:rriv";

export const authorizationCheck = async (body: Tuple) => {
  const response = await authServiceAxios.post("/check", body);
  const allowed = response.data.allowed;
  if (!allowed) {
    throw new HttpException(403, "access to resource denied");
  }
};

export const assertAdmin = async (accountId: string) => {
  await authorizationCheck({
    user: `user:${accountId}`,
    object: SYSTEM,
    relation: "admin",
  });
};

/**
 * true/false for an allowed/denied check. Only a denial (403) is `false`: an
 * auth-api failure is rethrown, so an outage never quietly downgrades a role.
 */
const allows = async (check: () => Promise<void>): Promise<boolean> => {
  try {
    await check();
    return true;
  } catch (error) {
    if (error instanceof HttpException && error.code === 403) {
      return false;
    }
    throw error;
  }
};

export const isAdmin = (accountId: string): Promise<boolean> =>
  allows(() => assertAdmin(accountId));

export const assertProvisioner = async (accountId: string) => {
  await authorizationCheck({
    user: `user:${accountId}`,
    object: SYSTEM,
    relation: "provisioner",
  });
};

export const isProvisioner = (accountId: string): Promise<boolean> =>
  allows(() => assertProvisioner(accountId));

export const read = async (body: {
  user?: string;
  relation?: string;
  object?: string;
}): Promise<Tuple[]> => {
  const response = await authServiceAxios.post("/read", body);
  const tuples = response.data.tuples.map(
    ({
      key: { user, relation, object },
    }: {
      key: Tuple;
      timestamp: string;
    }) => ({ user, relation, object }),
  );
  return tuples;
};

export const readResource = async (
  resource: { type: string; id: string },
  token?: string,
): Promise<Tuple[]> => {
  const response = await authServiceAxios.post("/read-resource", resource, {
    ...(token && { headers: { Authorization: `Bearer ${token}` } }),
  });
  return response.data.tuples;
};

export const listObjects = async (body: ListObjectDto): Promise<string[]> => {
  const response = await authServiceAxios.post("/list-objects", body);
  const objects = response.data.objects;
  return objects.map((o: string) => o.split(":")[1]);
};

export const listUsers = async (body: {
  userType: string;
  id: string;
  objectType: string;
  relation: string;
}): Promise<{ object: { type: string; id: string } }[]> => {
  const response = await authServiceAxios.post("/list-users", body);
  const users = response.data.users;
  return users;
};

/**
 * Direct, synchronous tuple write. Use for actions that must take effect
 * immediately and are not part of the convergent sync (e.g. managing the
 * `system:rriv` admin relation). The caller's request token is attached by the
 * client interceptor.
 */
export const writeRelationshipsNow = async (
  body: WriteRelationshipDto,
): Promise<void> => {
  await authServiceAxios.post("/relationship", {
    writes: body.writes ?? [],
    deletes: body.deletes ?? [],
  });
};
