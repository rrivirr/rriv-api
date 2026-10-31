import config from "../../infra/get-config.ts";
import { HttpException } from "../../utils/http-exception.ts";

/**
 * Firmware releases with signed images, read from the rriv-firmware GitHub
 * releases. Each release's CI job attaches `release.json` and
 * `rriv-firmware-signed.bin` (see rriv-firmware
 * `scripts/build-signed-release.sh`). The browser can read GitHub's release
 * list but not the files (no CORS on release downloads), so rriv-api serves
 * the signed image. That CI job verifies what it publishes, so a release's
 * files are taken as they are.
 */

export interface FirmwareRelease {
  /** The release tag; also the version in the image header (`fv`). */
  version: string;
  name: string;
  publishedAt: string | null;
  prerelease: boolean;
  notes: string;
  /** The bootloader built with this release (boards keep theirs). */
  bootloaderVersion: string | null;
  /**
   * The oldest bootloader this release works with (`min_bootloader` in its
   * release.json); null for releases from before the field, which work with
   * every bootloader that accepts their image.
   */
  minBootloader: string | null;
  /**
   * Whether the board's bootloader is new enough; only when the list was
   * asked for with that bootloader's version.
   */
  compatible?: boolean;
  /** Size of `rriv-firmware-signed.bin` in bytes. */
  size: number;
  sha256: string;
}

export interface SignedImage {
  release: FirmwareRelease;
  bytes: Uint8Array<ArrayBuffer>;
}

const FIRMWARE_RELEASES_REPO = "rrivirr/rriv-firmware";
const SIGNED_IMAGE = "rriv-firmware-signed.bin";
const MANIFEST = "release.json";
/** Releases looked at, newest first. */
const RELEASES_PER_PAGE = 30;

interface GithubAsset {
  id: number;
  name: string;
}

interface GithubRelease {
  tag_name: string;
  name: string | null;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
  published_at: string | null;
  assets: GithubAsset[];
}

const unreachable = () =>
  new HttpException(502, "Couldn't read the firmware releases from GitHub.");

const github = async (path: string, accept: string, allowNotFound = false) => {
  let response: Response;
  try {
    response = await fetch(
      `${config.GITHUB_API_URL}/repos/${FIRMWARE_RELEASES_REPO}/${path}`,
      {
        headers: {
          accept,
          "user-agent": "rriv-api",
          ...(config.GITHUB_TOKEN && {
            authorization: `Bearer ${config.GITHUB_TOKEN}`,
          }),
        },
      },
    );
  } catch {
    throw unreachable();
  }
  if (!response.ok && !(allowNotFound && response.status === 404)) {
    await response.body?.cancel();
    throw unreachable();
  }
  return response;
};

export const downloadAsset = async (
  id: number,
): Promise<Uint8Array<ArrayBuffer>> => {
  const response = await github(
    `releases/assets/${id}`,
    "application/octet-stream",
  );
  return new Uint8Array(await response.arrayBuffer());
};

/** `x.y.z` as numbers, or null for anything else. */
const parseVersion = (version: unknown): [number, number, number] | null => {
  const match = typeof version === "string" &&
    /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
};

export const atLeast = (version: string, minimum: string) => {
  const [have, need] = [parseVersion(version), parseVersion(minimum)];
  if (!have || !need) return false;
  const index = have.findIndex((part, i) => part !== need[i]);
  return index === -1 || have[index] > need[index];
};

/** The release's entry, or null if it has no usable signed image. */
const readRelease = async (
  release: GithubRelease,
): Promise<{ release: FirmwareRelease; imageAsset: number } | null> => {
  if (release.draft) return null;
  const manifestAsset = release.assets.find((a) => a.name === MANIFEST);
  const imageAsset = release.assets.find((a) => a.name === SIGNED_IMAGE);
  if (!manifestAsset || !imageAsset) return null;
  const bytes = await downloadAsset(manifestAsset.id);
  // deno-lint-ignore no-explicit-any
  let manifest: any;
  try {
    manifest = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    manifest = null;
  }
  const file = manifest?.files?.[SIGNED_IMAGE];
  if (typeof file?.sha256 !== "string" || typeof file?.size !== "number") {
    return null;
  }
  return {
    release: {
      version: release.tag_name,
      name: release.name || release.tag_name,
      publishedAt: release.published_at,
      prerelease: release.prerelease,
      notes: release.body ?? "",
      bootloaderVersion: typeof manifest.bootloader_version === "string"
        ? manifest.bootloader_version
        : null,
      minBootloader: manifest.min_bootloader ?? null,
      size: file.size,
      sha256: file.sha256.toLowerCase(),
    },
    imageAsset: imageAsset.id,
  };
};

export const fetchReleases = async (): Promise<FirmwareRelease[]> => {
  const response = await github(
    `releases?per_page=${RELEASES_PER_PAGE}`,
    "application/vnd.github+json",
  );
  const found = await Promise.all(
    ((await response.json()) as GithubRelease[]).map(readRelease),
  );
  return found.flatMap((entry) => (entry ? [entry.release] : []));
};

export const fetchRelease = async (version: string) => {
  const response = await github(
    `releases/tags/${encodeURIComponent(version)}`,
    "application/vnd.github+json",
    true,
  );
  if (response.status === 404) {
    await response.body?.cancel();
    return null;
  }
  return readRelease((await response.json()) as GithubRelease);
};
