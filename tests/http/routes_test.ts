import { assertEquals } from "@std/assert";
import { resetDb } from "../support/db.ts";
import { startHarness } from "../support/harness.ts";
import { apiFetch, listen } from "../support/http.ts";
import { createAccount } from "../support/factories.ts";

Deno.test("GET /version.yaml is public", async () => {
  const server = await listen();
  try {
    const response = await apiFetch(server.url, "/version.yaml");
    assertEquals(response.status, 200);
  } finally {
    await server.close();
  }
});

Deno.test("protected routes require a bearer token", async () => {
  const server = await listen();
  try {
    const response = await apiFetch(server.url, "/context");
    assertEquals(response.status, 401);
  } finally {
    await server.close();
  }
});

Deno.test("CORS allows the web origin and the app's methods", async () => {
  const server = await listen();
  try {
    const response = await apiFetch(server.url, "/context", {
      method: "OPTIONS",
      headers: {
        origin: "http://localhost:5173",
        "access-control-request-method": "DELETE",
      },
    });
    assertEquals(response.status, 204);
    assertEquals(
      response.headers.get("access-control-allow-origin"),
      "http://localhost:5173",
    );

    const methods = response.headers.get("access-control-allow-methods") ?? "";
    for (const method of ["GET", "POST", "PATCH", "PUT", "DELETE"]) {
      assertEquals(
        methods
          .split(",")
          .map((m) => m.trim())
          .includes(method),
        true,
        `Access-Control-Allow-Methods is missing ${method}`,
      );
    }
  } finally {
    await server.close();
  }
});

Deno.test(
  "POST /account onboards; GET /account/me reflects admin",
  async () => {
    const harness = await startHarness();
    const server = await listen();
    try {
      await resetDb();
      const created = await apiFetch(server.url, "/account", {
        method: "POST",
        body: JSON.stringify({
          firstName: "Ada",
          lastName: "Admin",
          email: "ada@test.local",
          password: "secret123",
        }),
      });
      assertEquals(created.status, 201);

      const accountId = harness.keycloak.createdUsers[0].id;
      const token = await harness.tokenFor(accountId);

      const me = await apiFetch(server.url, "/account/me", {
        headers: { authorization: `Bearer ${token}` },
      });
      assertEquals(me.status, 200);
      assertEquals((await me.json()).isAdmin, false);

      harness.authApi.seed([
        { user: `user:${accountId}`, relation: "admin", object: "system:rriv" },
      ]);
      const meAdmin = await apiFetch(server.url, "/account/me", {
        headers: { authorization: `Bearer ${token}` },
      });
      assertEquals((await meAdmin.json()).isAdmin, true);
    } finally {
      await server.close();
      await harness.stop();
    }
  },
);

Deno.test("auth-api outage fails protected reads closed (500)", async () => {
  const harness = await startHarness();
  const server = await listen();
  try {
    await resetDb();
    const account = await createAccount();
    const token = await harness.tokenFor(account.id);
    harness.authApi.failNext([503]);

    const response = await apiFetch(server.url, "/context", {
      headers: { authorization: `Bearer ${token}` },
    });
    assertEquals(response.status, 500);
  } finally {
    await server.close();
    await harness.stop();
  }
});
