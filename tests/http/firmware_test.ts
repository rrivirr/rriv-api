import { assertEquals } from "@std/assert";
import { resetDb } from "../support/db.ts";
import { startHarness } from "../support/harness.ts";
import { apiFetch, listen } from "../support/http.ts";
import { createAccount } from "../support/factories.ts";
import { signedRelease, startFakeGithub } from "../support/fake-github.ts";

const image = (fill: number) => new Uint8Array(1200).fill(fill);
const sha256 = async (bytes: Uint8Array<ArrayBuffer>) =>
  Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");

const setup = async () => {
  const harness = await startHarness();
  const github = await startFakeGithub();
  github.reset();
  await resetDb();
  const account = await createAccount();
  const auth = {
    authorization: `Bearer ${await harness.tokenFor(account.id)}`,
  };
  return { github, auth };
};

Deno.test("GET /firmware/releases lists releases with a signed image", async () => {
  const server = await listen();
  try {
    const { github, auth } = await setup();
    const newer = image(1);
    github.setReleases([
      signedRelease("v1.16.0", newer, await sha256(newer), {
        prerelease: true,
      }),
      // No signed image (released before CI signed them): left out.
      { tag: "v1.14.0", assets: { "rriv-firmware.elf": "elf" } },
      // CI owns what's in release.json: listed as it is.
      signedRelease("v1.15.1", image(2), await sha256(image(2)), {
        version: "v1.15.0",
      }),
    ]);

    const unauthenticated = await apiFetch(server.url, "/firmware/releases");
    assertEquals(unauthenticated.status, 401);

    const response = await apiFetch(server.url, "/firmware/releases", {
      headers: auth,
    });
    assertEquals(response.status, 200);
    assertEquals(await response.json(), [{
      version: "v1.16.0",
      name: "v1.16.0",
      publishedAt: "2026-10-23T12:00:00Z",
      prerelease: true,
      notes: "notes for v1.16.0",
      bootloaderVersion: "0.4.1",
      minBootloader: null,
      size: 1200,
      sha256: await sha256(newer),
    }, {
      version: "v1.15.1",
      name: "v1.15.1",
      publishedAt: "2026-10-23T12:00:00Z",
      prerelease: false,
      notes: "notes for v1.15.1",
      bootloaderVersion: "0.4.1",
      minBootloader: null,
      size: 1200,
      sha256: await sha256(image(2)),
    }]);

    // Not cached: each list reads the releases and their manifests again.
    await (await apiFetch(server.url, "/firmware/releases", { headers: auth }))
      .body?.cancel();
    assertEquals(github.listRequests, 2);
    assertEquals(github.assetRequests, 4);
  } finally {
    await server.close();
  }
});

Deno.test("GET /firmware/releases?bootloader= marks releases the bootloader is too old for", async () => {
  const server = await listen();
  try {
    const { github, auth } = await setup();
    github.setReleases([
      signedRelease("v1.18.0", image(3), await sha256(image(3)), {
        minBootloader: "1.10.0",
      }),
      signedRelease("v1.17.0", image(4), await sha256(image(4)), {
        minBootloader: "1.2.0",
      }),
      // From before min_bootloader: works with any bootloader.
      signedRelease("v1.16.0", image(5), await sha256(image(5))),
      // A requirement that can't be read can't be confirmed: too old.
      signedRelease("v1.15.0", image(6), await sha256(image(6)), {
        minBootloader: "1.2",
      }),
    ]);
    const list = async (query: string) => {
      const response = await apiFetch(
        server.url,
        `/firmware/releases${query}`,
        { headers: auth },
      );
      assertEquals(response.status, 200);
      return await response.json();
    };

    // 1.9.0 is older than 1.10.0 (numbers, not text).
    assertEquals(
      (await list("?bootloader=1.9.0")).map((
        r: {
          version: string;
          minBootloader: string | null;
          compatible: boolean;
        },
      ) => [r.version, r.minBootloader, r.compatible]),
      [
        ["v1.18.0", "1.10.0", false],
        ["v1.17.0", "1.2.0", true],
        ["v1.16.0", null, true],
        ["v1.15.0", "1.2", false],
      ],
    );
    assertEquals(
      (await list("?bootloader=1.10.0")).map((r: { compatible: boolean }) =>
        r.compatible
      ),
      [true, true, true, false],
    );
    // Without the board's bootloader: no `compatible`, as before.
    assertEquals(
      (await list("")).map((r: { compatible?: boolean }) => r.compatible),
      [undefined, undefined, undefined, undefined],
    );

    const invalid = await apiFetch(
      server.url,
      "/firmware/releases?bootloader=latest",
      { headers: auth },
    );
    assertEquals(invalid.status, 422);
    await invalid.body?.cancel();
  } finally {
    await server.close();
  }
});

Deno.test("GET /firmware/releases/:version/image serves the image", async () => {
  const server = await listen();
  try {
    const { github, auth } = await setup();
    const good = image(7);
    github.setReleases([
      signedRelease("v1.16.0", good, await sha256(good)),
      // CI owns the match with release.json: served as it is.
      signedRelease("v1.15.0", image(8), await sha256(image(9))),
    ]);

    const response = await apiFetch(
      server.url,
      "/firmware/releases/v1.16.0/image",
      { headers: auth },
    );
    assertEquals(response.status, 200);
    assertEquals(
      response.headers.get("content-type"),
      "application/octet-stream",
    );
    assertEquals(
      response.headers.get("content-disposition"),
      'attachment; filename="rriv-firmware-v1.16.0-signed.bin"',
    );
    assertEquals(new Uint8Array(await response.arrayBuffer()), good);

    // Asks for that release alone: its manifest and image, not the list.
    assertEquals(github.listRequests, 0);
    assertEquals(github.tagRequests, 1);
    assertEquals(github.assetRequests, 2);

    const mismatched = await apiFetch(
      server.url,
      "/firmware/releases/v1.15.0/image",
      { headers: auth },
    );
    assertEquals(mismatched.status, 200);
    assertEquals(new Uint8Array(await mismatched.arrayBuffer()), image(8));

    const missing = await apiFetch(
      server.url,
      "/firmware/releases/v9.9.9/image",
      { headers: auth },
    );
    assertEquals(missing.status, 404);
    await missing.body?.cancel();
  } finally {
    await server.close();
  }
});

Deno.test("GET /firmware/releases/:version/image keeps a tag with a slash in one URL segment", async () => {
  const server = await listen();
  try {
    const { github, auth } = await setup();
    const good = image(10);
    github.setReleases([signedRelease("feat/x", good, await sha256(good))]);

    const response = await apiFetch(
      server.url,
      "/firmware/releases/feat%2Fx/image",
      { headers: auth },
    );
    assertEquals(response.status, 200);
    assertEquals(new Uint8Array(await response.arrayBuffer()), good);
  } finally {
    await server.close();
  }
});

Deno.test("GET /firmware/releases/:version/image: a release without a usable image is a 404", async () => {
  const server = await listen();
  try {
    const { github, auth } = await setup();
    github.setReleases([
      { tag: "v1.14.0", assets: { "rriv-firmware.elf": "elf" } },
    ]);

    const response = await apiFetch(
      server.url,
      "/firmware/releases/v1.14.0/image",
      { headers: auth },
    );
    assertEquals(response.status, 404);
    await response.body?.cancel();
  } finally {
    await server.close();
  }
});

Deno.test("firmware releases: GitHub unreachable is a 502", async () => {
  const server = await listen();
  try {
    const { github, auth } = await setup();
    github.fail(403);
    const response = await apiFetch(server.url, "/firmware/releases", {
      headers: auth,
    });
    assertEquals(response.status, 502);
    await response.body?.cancel();

    const image = await apiFetch(
      server.url,
      "/firmware/releases/v1.16.0/image",
      { headers: auth },
    );
    assertEquals(image.status, 502);
    await image.body?.cancel();
  } finally {
    await server.close();
  }
});
