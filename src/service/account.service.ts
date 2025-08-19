import { CreateAccountDto } from "../types/account.types.ts";
import * as keycloak from "../infra/keycloak/keycloak.ts";
import * as accountRepository from "../repository/account.repository.ts";
import { KEYCLOAK_ACTIONS_EMAIL } from "../infra/keycloak/enum.ts";

export const createAccount = async (body: CreateAccountDto) => {
  const userId = await keycloak.createUser({ ...body });
  await accountRepository.createAccount({ ...body, id: userId });
  await keycloak.executeActionsEmail(
    KEYCLOAK_ACTIONS_EMAIL.VERIFY_EMAIL,
    userId,
    false,
  );
};

export const verifyEmail = async (email: string) => {
  const user = await accountRepository.getAccountByEmail(email);

  if (user) {
    await keycloak.executeActionsEmail(
      KEYCLOAK_ACTIONS_EMAIL.VERIFY_EMAIL,
      user.id,
      true,
    );
  }
};

export const resetPassword = async (email: string) => {
  const user = await accountRepository.getAccountByEmail(email);

  if (user) {
    await keycloak.executeActionsEmail(
      KEYCLOAK_ACTIONS_EMAIL.UPDATE_PASSWORD,
      user.id,
      true,
    );
  }
};
