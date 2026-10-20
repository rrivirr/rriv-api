/**
 * In-process fake Keycloak: serves the realm JWKS, the token endpoint and the
 * two admin endpoints rriv-api uses. Tokens are real RS256 JWTs signed with a
 * per-run key pair (with a `kid`), so the app's JWKS verifier accepts them.
 * The admin endpoints only accept a token from the admin client
 * (`KEYCLOAK_CLIENT_ID`), like a realm where only that client can manage users.
 */
// @deno-types="npm:@types/express@5"
import express from "npm:express";
import { KEYCLOAK_CLIENT_ID, KEYCLOAK_REALM, KEYCLOAK_URL } from "./env.ts";

const toBase64 = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes));

const toBase64Url = (bytes: Uint8Array): string =>
  toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export interface FakeKeycloak {
  /** Sign an access token (used by tests to mint user/service tokens). */
  issueToken: (
    claims: Record<string, unknown>,
    options?: { issuer?: string; expiresIn?: number },
  ) => Promise<string>;
  /** Make the JWKS endpoint fail (true) or recover (false). */
  setJwksUnavailable: (unavailable: boolean) => void;
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

  const kid = "test-key-1";
  const publicJwk = {
    ...(await crypto.subtle.exportKey("jwk", keyPair.publicKey)),
    kid,
    alg: "RS256",
    use: "sig",
  };
  let jwksUnavailable = false;

  const issuer = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`;
  const createdUsers: { email: string; id: string }[] = [];

  const issueToken = async (
    claims: Record<string, unknown>,
    options: { issuer?: string; expiresIn?: number } = {},
  ): Promise<string> => {
    const now = Math.floor(Date.now() / 1000);
    const header = toBase64Url(
      new TextEncoder().encode(
        JSON.stringify({ alg: "RS256", typ: "JWT", kid }),
      ),
    );
    const payload = toBase64Url(
      new TextEncoder().encode(
        JSON.stringify({
          iat: now,
          exp: now + (options.expiresIn ?? 3600),
          iss: options.issuer ?? issuer,
          ...claims,
        }),
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

  const requireAdminClient: express.RequestHandler = (req, res, next) => {
    const token = req.headers.authorization?.replace("Bearer ", "") ?? "";
    let azp: unknown;
    try {
      azp = JSON.parse(
        atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      ).azp;
    } catch {
      azp = undefined;
    }
    if (azp !== KEYCLOAK_CLIENT_ID) {
      res.sendStatus(403);
      return;
    }
    next();
  };

  app.get(
    `/realms/${KEYCLOAK_REALM}/protocol/openid-connect/certs`,
    (_req, res) => {
      if (jwksUnavailable) {
        res.status(503).json({ error: "unavailable" });
        return;
      }
      res.json({ keys: [publicJwk] });
    },
  );

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
    requireAdminClient,
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
    requireAdminClient,
    (_req, res) => {
      res.sendStatus(204);
    },
  );

  const server = app.listen(port);
  await new Promise<void>((resolve) => server.once("listening", resolve));

  return {
    issueToken,
    setJwksUnavailable: (value) => {
      jwksUnavailable = value;
    },
    createdUsers,
    stop: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
};
