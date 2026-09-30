/**
 * Boots the in-process fakes and provides helpers to act as a signed-in user
 * (the JWT that `authServiceAxios` reads from async-local storage).
 *
 * The fake servers bind fixed ports, so they are started **once per process**
 * and reused; `startHarness()` resets the fake auth-api store before each test.
 * Rebinding the same port between tests was flaky.
 */
import { storage } from "../../src/utils/async-local-storage.ts";
import { AUTH_SERVICE_PORT, KEYCLOAK_PORT } from "./env.ts";
import { type FakeAuthApi, startFakeAuthApi } from "./fake-auth-api.ts";
import { type FakeKeycloak, startFakeKeycloak } from "./fake-keycloak.ts";

export interface Harness {
  authApi: FakeAuthApi;
  keycloak: FakeKeycloak;
  tokenFor: (accountId: string, azp?: string) => Promise<string>;
  /** Runs `fn` with the account's bearer token in async-local storage. */
  asUser: <T>(accountId: string, fn: () => Promise<T>) => Promise<T>;
  /** Kept for symmetry; the shared fakes live until the process exits. */
  stop: () => Promise<void>;
}

let shared: { keycloak: FakeKeycloak; authApi: FakeAuthApi } | null = null;

const ensureShared = async (): Promise<{
  keycloak: FakeKeycloak;
  authApi: FakeAuthApi;
}> => {
  shared ??= {
    keycloak: await startFakeKeycloak(KEYCLOAK_PORT),
    authApi: await startFakeAuthApi(AUTH_SERVICE_PORT),
  };
  return shared;
};

export const startHarness = async (): Promise<Harness> => {
  const { keycloak, authApi } = await ensureShared();
  authApi.reset();

  const tokenFor = (accountId: string, azp = "rriv-web") =>
    keycloak.issueToken({ sub: accountId, azp, preferred_username: accountId });

  return {
    authApi,
    keycloak,
    tokenFor,
    asUser: async <T>(accountId: string, fn: () => Promise<T>): Promise<T> => {
      const token = await tokenFor(accountId);
      return await storage.run({ token }, fn);
    },
    stop: () => Promise.resolve(),
  };
};
