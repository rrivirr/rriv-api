/**
 * Test-environment constants. Values come from `--env-file=.env.test`.
 */

const require = (name: string): string => {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`missing ${name}; run tests with --env-file=.env.test`);
  }
  return value;
};

export const AUTH_SERVICE_URL = require("AUTH_SERVICE_URL");
export const KEYCLOAK_URL = require("KEYCLOAK_URL");
export const KEYCLOAK_REALM = require("KEYCLOAK_REALM");
export const DATABASE_URL = require("DATABASE_URL");

export const AUTH_SERVICE_PORT = Number(new URL(AUTH_SERVICE_URL).port);
export const KEYCLOAK_PORT = Number(new URL(KEYCLOAK_URL).port);
