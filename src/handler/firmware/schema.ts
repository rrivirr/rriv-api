import { z } from "zod";

/** A release tag as it sits in an image header: 1-32 printable ASCII. */
export const firmwareVersionSchema = z.object({
  version: z.string().regex(/^[\x21-\x7e]{1,32}$/),
}).strict();

/** `?bootloader=x.y.z`: the board's bootloader version (its `info` reply). */
export const firmwareReleasesQuerySchema = z.strictObject({
  bootloader: z.string().regex(/^\d+\.\d+\.\d+$/).optional(),
});
