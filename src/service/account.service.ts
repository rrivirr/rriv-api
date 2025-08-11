import { CreateAccountDto } from "../types/account.types.ts";
import * as keycloak from "../infra/keycloak/keycloak.ts";
import * as accountRepository from "../repository/account.repository.ts";

export const createAccount = async (body: CreateAccountDto) => {
  const userId = await keycloak.createUser({ ...body });
  await accountRepository.createAccount({ ...body, id: userId });
};
