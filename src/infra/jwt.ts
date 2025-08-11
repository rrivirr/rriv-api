// @deno-types="npm:@types/jsonwebtoken@9"
import jwt from "npm:jsonwebtoken";
import { keycloakIssuer } from "./keycloak/config.ts";

export const verifyJwtToken = (token: string) => {
  const publicKey = Deno.env.get("KEYCLOAK_PUBLIC_KEY");
  return jwt.verify(token, publicKey!, {
    algorithms: ["RS256"],
    issuer: keycloakIssuer,
  });
};
