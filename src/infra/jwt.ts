// @deno-types="npm:@types/jsonwebtoken@9"
import jwt from "npm:jsonwebtoken";
import { keycloakIssuer } from "./keycloak/config.ts";
import { getPublicKey } from "./keycloak/keycloak.ts";

export const verifyJwtToken = async (token: string) => {
  const publicKey = await getPublicKey();
  const formattedPublicKey = "-----BEGIN PUBLIC KEY-----\n" +
    publicKey.match(/.{1,64}/g).join("\n") +
    "\n-----END PUBLIC KEY-----";

  return jwt.verify(token, formattedPublicKey, {
    algorithms: ["RS256"],
    issuer: keycloakIssuer,
  });
};
