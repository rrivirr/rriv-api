/**
 * In-process fake GitHub REST API for firmware releases: the release list, a
 * release by tag and asset downloads (`Accept: application/octet-stream`).
 * Counts requests so the ones made can be checked. Started once per process,
 * like the other fakes.
 */
// @deno-types="npm:@types/express@5"
import express from "npm:express";
import { Buffer } from "node:buffer";
import { GITHUB_API_PORT } from "./env.ts";

export interface FakeRelease {
  tag: string;
  prerelease?: boolean;
  /** Asset name → content. */
  assets: Record<string, Uint8Array | string>;
}

export interface FakeGithub {
  listRequests: number;
  tagRequests: number;
  assetRequests: number;
  setReleases: (releases: FakeRelease[]) => void;
  /** Answer every request with this status (e.g. 403 when rate-limited). */
  fail: (status: number | null) => void;
  reset: () => void;
}

let shared: FakeGithub | null = null;

export const startFakeGithub = async (): Promise<FakeGithub> => {
  if (shared) return shared;
  let releases: FakeRelease[] = [];
  let failing: number | null = null;
  const assets = new Map<number, Uint8Array | string>();
  // Stable ids per release asset, as on GitHub.
  const assetIds = new Map<Uint8Array | string, number>();

  const toGithub = (release: FakeRelease) => ({
    tag_name: release.tag,
    name: release.tag,
    body: `notes for ${release.tag}`,
    draft: false,
    prerelease: release.prerelease ?? false,
    published_at: "2026-10-23T12:00:00Z",
    assets: Object.entries(release.assets).map(([name, content]) => {
      const id = assetIds.get(content) ?? assetIds.size + 1;
      assetIds.set(content, id);
      assets.set(id, content);
      return { id, name };
    }),
  });

  const app = express();
  app.use((_req, res, next) => {
    if (failing !== null) {
      res.status(failing).json({ message: "failing" });
      return;
    }
    next();
  });
  app.get("/repos/rrivirr/rriv-firmware/releases", (_req, res) => {
    fake.listRequests += 1;
    res.json(releases.map(toGithub));
  });
  app.get("/repos/rrivirr/rriv-firmware/releases/tags/:tag", (req, res) => {
    fake.tagRequests += 1;
    const release = releases.find((r) => r.tag === req.params.tag);
    if (!release) {
      res.status(404).json({ message: "Not Found" });
      return;
    }
    res.json(toGithub(release));
  });
  app.get("/repos/rrivirr/rriv-firmware/releases/assets/:id", (req, res) => {
    fake.assetRequests += 1;
    const content = assets.get(Number(req.params.id));
    if (
      content === undefined || req.headers.accept !== "application/octet-stream"
    ) {
      res.status(404).json({ message: "Not Found" });
      return;
    }
    res.type("application/octet-stream").send(Buffer.from(content));
  });

  const server = app.listen(GITHUB_API_PORT);
  await new Promise<void>((resolve) => server.once("listening", resolve));

  const fake: FakeGithub = {
    listRequests: 0,
    tagRequests: 0,
    assetRequests: 0,
    setReleases: (next) => {
      releases = next;
    },
    fail: (status) => {
      failing = status;
    },
    reset: () => {
      releases = [];
      failing = null;
      assets.clear();
      assetIds.clear();
      fake.listRequests = 0;
      fake.tagRequests = 0;
      fake.assetRequests = 0;
    },
  };
  shared = fake;
  return shared;
};

/** A release as CI publishes it: signed image + matching release.json. */
export const signedRelease = (
  tag: string,
  image: Uint8Array,
  sha256: string,
  overrides: Partial<
    { version: string; prerelease: boolean; minBootloader: string }
  > = {},
): FakeRelease => ({
  tag,
  prerelease: overrides.prerelease,
  assets: {
    "rriv-firmware-signed.bin": image,
    "rriv-firmware.elf": "elf",
    "release.json": JSON.stringify({
      version: overrides.version ?? tag,
      bootloader_version: "0.4.1",
      ...(overrides.minBootloader &&
        { min_bootloader: overrides.minBootloader }),
      files: { "rriv-firmware-signed.bin": { size: image.length, sha256 } },
    }),
  },
});
