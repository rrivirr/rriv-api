import { Ajv, AnySchema } from "ajv";
import { HttpException } from "../../utils/http-exception.ts";

/**
 * An official config is RRIV-curated and always public: its owner can't make
 * it private until an admin unmarks it.
 */
export const assertLibraryUpdateAllowed = (
  libraryConfig: { isOfficial: boolean },
  update: { isPublic?: boolean },
) => {
  if (libraryConfig.isOfficial && update.isPublic === false) {
    throw new HttpException(
      409,
      "an official config stays public; ask an admin to unmark it first",
    );
  }
};

/**
 * The driver the client chose for a library config (as device uploads do),
 * checked to exist (and not be archived).
 */
export const requireDriver = <T extends { id: string; validation: unknown }>(
  driver: T | null | undefined,
  what: "sensor" | "datalogger",
): T => {
  if (!driver) throw new HttpException(422, `${what} driver not found`);
  return driver;
};

/**
 * A library config must pass its driver's schema, like a device upload does,
 * so nothing is published that a device couldn't record.
 */
export const assertMatchesDriver = (
  driver: { validation: unknown },
  config: unknown,
  what: string,
) => {
  const validate = new Ajv().compile(driver.validation as AnySchema);
  if (!validate(config)) {
    throw new HttpException(422, `invalid ${what} config received`);
  }
};
