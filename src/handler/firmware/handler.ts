// @deno-types="npm:@types/express@5"
import { Request, Response } from "npm:express";
import { Buffer } from "node:buffer";
import {
  firmwareReleasesQuerySchema,
  firmwareVersionSchema,
} from "./schema.ts";
import * as firmwareReleaseService from "../../service/firmware-release.service.ts";

export const listFirmwareReleases = async (req: Request, res: Response) => {
  const { bootloader } = firmwareReleasesQuerySchema.parse(req.query);
  res.json(await firmwareReleaseService.listFirmwareReleases(bootloader));
};

export const getSignedFirmwareImage = async (req: Request, res: Response) => {
  const { version } = firmwareVersionSchema.parse(req.params);
  const { release, bytes } = await firmwareReleaseService.getSignedImage(
    version,
  );
  res
    .type("application/octet-stream")
    .attachment(`rriv-firmware-${release.version}-signed.bin`)
    .send(Buffer.from(bytes));
};
