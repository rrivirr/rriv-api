import { createRemoteJWKSet, errors, jwtVerify } from "jose";
import { keycloakIssuer } from "./keycloak/config.ts";
import { HttpException } from "../utils/http-exception.ts";

const jwks = createRemoteJWKSet(
  new URL(`${keycloakIssuer}/protocol/openid-connect/certs`),
);

export const verifyJwtToken = async (token: string) => {
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: keycloakIssuer,
      algorithms: ["RS256"],
    });
    return payload;
  } catch (error) {
    if (
      error instanceof errors.JOSEError &&
      (error.code.startsWith("ERR_JWT_") ||
        error.code.startsWith("ERR_JWS_") ||
        error.code === "ERR_JWKS_NO_MATCHING_KEY" ||
        error.code === "ERR_JWKS_MULTIPLE_MATCHING_KEYS")
    ) {
      throw new HttpException(401, "invalid access token");
    }
    throw new HttpException(503, "authentication service unavailable");
  }
};
