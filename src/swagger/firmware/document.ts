import { swaggerBuilder } from "../index.ts";

const basePath = "/firmware/releases";
const tags = ["firmware"];
const unreachable = {
  502: {
    description: "GitHub couldn't be reached.",
  },
};

const release = {
  type: "object",
  properties: {
    version: {
      type: "string",
      description: "Release tag; also the version in the image header (`fv`).",
    },
    name: { type: "string" },
    publishedAt: { type: ["string", "null"], format: "date-time" },
    prerelease: { type: "boolean" },
    notes: { type: "string", description: "Release notes (Markdown)." },
    bootloaderVersion: {
      type: ["string", "null"],
      description: "The bootloader built with this release.",
    },
    minBootloader: {
      type: ["string", "null"],
      description:
        "The oldest bootloader this release works with; null for releases from before the field.",
    },
    compatible: {
      type: "boolean",
      description:
        "Whether the `bootloader` given in the query is new enough. Only when that parameter is given.",
    },
    size: { type: "integer", description: "Signed image size in bytes." },
    sha256: { type: "string" },
  },
};

swaggerBuilder.addPath(basePath, {
  get: {
    tags,
    summary: `firmware releases with a signed image, newest first`,
    description:
      "From the rriv-firmware GitHub releases that carry `release.json` and `rriv-firmware-signed.bin`.",
    security: [{ bearerAuth: [] }],
    parameters: [{
      name: "bootloader",
      in: "query",
      required: false,
      description:
        "The board's bootloader version (`x.y.z`, from its `info` reply). Each release then says whether it's `compatible`; incompatible releases stay in the list.",
      schema: { type: "string", pattern: "^\\d+\\.\\d+\\.\\d+$" },
    }],
    responses: {
      200: {
        content: {
          "application/json": { schema: { type: "array", items: release } },
        },
      },
      422: { description: "`bootloader` isn't `x.y.z`." },
      ...unreachable,
    },
  },
});

swaggerBuilder.addPath(`${basePath}/{version}/image`, {
  get: {
    tags,
    summary: `a release's signed image, to install over USB`,
    description:
      "The release's `rriv-firmware-signed.bin` (header + app). GitHub's release downloads can't be read by a browser (no CORS), hence this proxy.",
    security: [{ bearerAuth: [] }],
    parameters: [{
      name: "version",
      in: "path",
      required: true,
      schema: { type: "string" },
    }],
    responses: {
      200: {
        content: {
          "application/octet-stream": {
            schema: { type: "string", format: "binary" },
          },
        },
      },
      404: { description: "No release with that version has a signed image." },
      ...unreachable,
    },
  },
});
