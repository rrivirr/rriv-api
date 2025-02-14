// @deno-types="npm:@types/jsonwebtoken@9"
import jwt from "npm:jsonwebtoken";

export const verifyJwtToken = (token: string) => {
  const publicKey = Deno.env.get("KEYCLOAK_PUBLIC_KEY");
  const issuer = Deno.env.get("KEYCLOAK_ISSUER");
  return jwt.verify(token, publicKey!, { algorithms: ["RS256"], issuer });
};
