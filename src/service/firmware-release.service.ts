import { HttpException } from "../utils/http-exception.ts";
import {
  atLeast,
  downloadAsset,
  fetchRelease,
  fetchReleases,
  FirmwareRelease,
  SignedImage,
} from "./utils/firmware-release.ts";

export const listFirmwareReleases = async (
  bootloader?: string,
): Promise<FirmwareRelease[]> => {
  const releases = await fetchReleases();
  if (bootloader === undefined) return releases;
  return releases.map((release) => ({
    ...release,
    compatible: release.minBootloader === null ||
      atLeast(bootloader, release.minBootloader),
  }));
};

export const getSignedImage = async (version: string): Promise<SignedImage> => {
  const entry = await fetchRelease(version);
  if (!entry) {
    throw new HttpException(404, `No firmware release ${version}.`);
  }
  const { release, imageAsset } = entry;
  return { release, bytes: await downloadAsset(imageAsset) };
};
