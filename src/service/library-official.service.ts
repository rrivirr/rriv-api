import prisma from "../infra/prisma.ts";
import { HttpException } from "../utils/http-exception.ts";

export const LIBRARY_KINDS = ["sensor", "datalogger", "system"] as const;
export type LibraryKind = (typeof LIBRARY_KINDS)[number];

/**
 * Mark (or unmark) an existing library config as an official RRIV config.
 * Admins only (checked by the caller). Marking also makes it public: an
 * official config is always public.
 */
export const setLibraryConfigOfficial = async (input: {
  kind: LibraryKind;
  id: string;
  isOfficial: boolean;
}) => {
  const { kind, id, isOfficial } = input;
  const where = { id, archivedAt: null };
  const data = { isOfficial, ...(isOfficial && { isPublic: true }) };
  const select = {
    id: true,
    name: true,
    isPublic: true,
    isOfficial: true,
  };

  const found = kind === "sensor"
    ? await prisma.sensorLibraryConfig.findFirst({ where })
    : kind === "datalogger"
    ? await prisma.dataloggerLibraryConfig.findFirst({ where })
    : await prisma.systemLibraryConfig.findFirst({ where });
  if (!found) throw new HttpException(404, "library config not found");

  return kind === "sensor"
    ? await prisma.sensorLibraryConfig.update({ where: { id }, data, select })
    : kind === "datalogger"
    ? await prisma.dataloggerLibraryConfig.update({
      where: { id },
      data,
      select,
    })
    : await prisma.systemLibraryConfig.update({ where: { id }, data, select });
};
