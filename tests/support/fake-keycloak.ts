/**
 * In-process fake Keycloak: serves the realm public key, the token endpoint and
 * the two admin endpoints rriv-api uses. Tokens are real RS256 JWTs signed with
 * a per-run key pair, so `jsonwebtoken.verify` in the app accepts them.
 */
// @deno-types="npm:@types/express@5"
import express from "npm:express";
import { KEYCLOAK_REALM, KEYCLOAK_URL } from "./env.ts";

const toBase64 = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes));

const toBase64Url = (bytes: Uint8Array): string =>
  toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export interface FakeKeycloak {
  /** Sign an access token (used by tests to mint user/service tokens). */
  issueToken: (claims: Record<string, unknown>) => Promise<string>;
  publicKeyB64: string;
  createdUsers: { email: string; id: string }[];
  stop: () => Promise<void>;
}

export const startFakeKeycloak = async (
  port: number,
): Promise<FakeKeycloak> => {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  ) as CryptoKeyPair;

  const publicKeyB64 = toBase64(
    new Uint8Array(await crypto.subtle.exportKey("spki", keyPair.publicKey)),
  );

  const issuer = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`;
  const createdUsers: { email: string; id: string }[] = [];

  const issueToken = async (
    claims: Record<string, unknown>,
  ): Promise<string> => {
    const now = Math.floor(Date.now() / 1000);
    const header = toBase64Url(
      new TextEncoder().encode(JSON.stringify({ alg: "RS256", typ: "JWT" })),
    );
    const payload = toBase64Url(
      new TextEncoder().encode(
        JSON.stringify({ iat: now, exp: now + 3600, iss: issuer, ...claims }),
      ),
    );
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      keyPair.privateKey,
      new TextEncoder().encode(`${header}.${payload}`),
    );
    return `${header}.${payload}.${toBase64Url(new Uint8Array(signature))}`;
  };

  const app = express();

  app.get(`/realms/${KEYCLOAK_REALM}`, (_req, res) => {
    res.json({ realm: KEYCLOAK_REALM, public_key: publicKeyB64 });
  });

  app.post(
    `/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`,
    express.urlencoded({ extended: false }),
    async (req, res) => {
      const clientId = String(req.body?.client_id ?? "");
      const grantType = String(req.body?.grant_type ?? "");
      const username = String(req.body?.username ?? "");
      const subject = grantType === "client_credentials" ? clientId : username;
      const access_token = await issueToken({
        sub: subject,
        azp: clientId,
        preferred_username: grantType === "client_credentials"
          ? `service-account-${clientId}`
          : username,
      });
      res.json({ access_token, expires_in: 3600, token_type: "Bearer" });
    },
  );

  app.post(
    `/admin/realms/${KEYCLOAK_REALM}/users`,
    express.json(),
    (req, res) => {
      const id = crypto.randomUUID();
      createdUsers.push({ email: String(req.body?.email ?? ""), id });
      res.setHeader(
        "Location",
        `${KEYCLOAK_URL}/admin/realms/${KEYCLOAK_REALM}/users/${id}`,
      );
      res.status(201).json({});
    },
  );

  app.put(
    `/admin/realms/${KEYCLOAK_REALM}/users/:id/execute-actions-email`,
    (_req, res) => {
      res.sendStatus(204);
    },
  );

  const server = app.listen(port);
  await new Promise<void>((resolve) => server.once("listening", resolve));

  return {
    issueToken,
    publicKeyB64,
    createdUsers,
    stop: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
};
