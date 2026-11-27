import { isDeepStrictEqual } from "node:util";
import { HttpException } from "../../utils/http-exception.ts";
import * as configSourceRepository from "../../repository/config-source.repository.ts";

/**
 * The library version a device config row came from. Sent by a client that
 * applied a library version to the device; omitted for hand edits.
 */
export type ConfigSource = {
  kind: "sensor" | "datalogger" | "system";
  versionId: string;
};

export type SensorSourceColumns = {
  sourceSensorLibraryConfigVersionId: string | null;
  sourceSystemLibraryConfigVersionId: string | null;
};

export type DataloggerSourceColumns = {
  sourceDataloggerLibraryConfigVersionId: string | null;
  sourceSystemLibraryConfigVersionId: string | null;
};

const NO_SENSOR_SOURCE: SensorSourceColumns = {
  sourceSensorLibraryConfigVersionId: null,
  sourceSystemLibraryConfigVersionId: null,
};

const NO_DATALOGGER_SOURCE: DataloggerSourceColumns = {
  sourceDataloggerLibraryConfigVersionId: null,
  sourceSystemLibraryConfigVersionId: null,
};

type Library = {
  creatorId: string;
  isPublic: boolean;
  archivedAt: Date | null;
};

/** Same rule as reading a library config: the creator's, or public. */
const assertReadable = (
  version: { archivedAt: Date | null } | null,
  library: Library | undefined,
  accountId: string,
) => {
  if (
    !version || version.archivedAt || !library || library.archivedAt ||
    (library.creatorId !== accountId && !library.isPublic)
  ) {
    throw new HttpException(422, "source library version not found");
  }
};

const typeOf = (config: unknown) =>
  config && typeof config === "object"
    ? (config as Record<string, unknown>).type
    : undefined;

/**
 * Source columns for a new sensor config row.
 *
 * - `source` given: checked (exists, readable, a sensor or system version,
 *   same sensor type) and used.
 * - `source: null`: not from a library (e.g. a saved snapshot); cleared.
 * - No `source` (a hand edit): the replaced row's source is kept, unless the
 *   sensor's type changed. Every version of a sensor library config has one
 *   type, so a sensor of another type can't match its source again.
 */
export const resolveSensorSource = async (args: {
  source?: ConfigSource | null;
  accountId: string;
  name: string;
  config: unknown;
  previous?: { config: unknown } & SensorSourceColumns;
}): Promise<SensorSourceColumns> => {
  const { source, accountId, name, config, previous } = args;

  if (source === null) return NO_SENSOR_SOURCE;
  if (!source) {
    if (!previous || typeOf(previous.config) !== typeOf(config)) {
      return NO_SENSOR_SOURCE;
    }
    return {
      sourceSensorLibraryConfigVersionId:
        previous.sourceSensorLibraryConfigVersionId,
      sourceSystemLibraryConfigVersionId:
        previous.sourceSystemLibraryConfigVersionId,
    };
  }

  if (source.kind === "sensor") {
    const version = await configSourceRepository
      .getSensorLibraryConfigVersionSource(source.versionId);
    assertReadable(version, version?.SensorLibraryConfig, accountId);
    if (typeOf(version!.SensorConfig.config) !== typeOf(config)) {
      throw new HttpException(
        422,
        "sensor type doesn't match the source library version",
      );
    }
    return {
      ...NO_SENSOR_SOURCE,
      sourceSensorLibraryConfigVersionId: version!.id,
    };
  }

  if (source.kind === "system") {
    const version = await configSourceRepository
      .getSystemLibraryConfigVersionSource(source.versionId);
    assertReadable(version, version?.SystemLibraryConfig, accountId);
    const librarySensor = version!.ConfigSnapshot.SensorConfig.find((s) =>
      s.name === name
    );
    if (!librarySensor) {
      throw new HttpException(
        422,
        `the source library version has no sensor ${name}`,
      );
    }
    if (typeOf(librarySensor.config) !== typeOf(config)) {
      throw new HttpException(
        422,
        "sensor type doesn't match the source library version",
      );
    }
    return {
      ...NO_SENSOR_SOURCE,
      sourceSystemLibraryConfigVersionId: version!.id,
    };
  }

  throw new HttpException(
    422,
    "a sensor config can't come from a datalogger library",
  );
};

/**
 * Source columns for a new datalogger config row. Same rules as sensors,
 * without the type check (a datalogger has no type).
 */
export const resolveDataloggerSource = async (args: {
  source?: ConfigSource | null;
  accountId: string;
  previous?: DataloggerSourceColumns;
}): Promise<DataloggerSourceColumns> => {
  const { source, accountId, previous } = args;

  if (source === null) return NO_DATALOGGER_SOURCE;
  if (!source) {
    if (!previous) return NO_DATALOGGER_SOURCE;
    return {
      sourceDataloggerLibraryConfigVersionId:
        previous.sourceDataloggerLibraryConfigVersionId,
      sourceSystemLibraryConfigVersionId:
        previous.sourceSystemLibraryConfigVersionId,
    };
  }

  if (source.kind === "datalogger") {
    const version = await configSourceRepository
      .getDataloggerLibraryConfigVersionSource(source.versionId);
    assertReadable(version, version?.DataloggerLibraryConfig, accountId);
    return {
      ...NO_DATALOGGER_SOURCE,
      sourceDataloggerLibraryConfigVersionId: version!.id,
    };
  }

  if (source.kind === "system") {
    const version = await configSourceRepository
      .getSystemLibraryConfigVersionSource(source.versionId);
    assertReadable(version, version?.SystemLibraryConfig, accountId);
    return {
      ...NO_DATALOGGER_SOURCE,
      sourceSystemLibraryConfigVersionId: version!.id,
    };
  }

  throw new HttpException(
    422,
    "a datalogger config can't come from a sensor library",
  );
};

/**
 * True when an upload would change nothing: same settings and same source as
 * the active row. Such an upload is accepted without writing a row.
 */
export const isUnchanged = <T extends object>(
  previous: ({ config: unknown } & T) | undefined,
  config: unknown,
  source: T,
) =>
  previous !== undefined &&
  isDeepStrictEqual(previous.config, config) &&
  Object.entries(source).every(([key, value]) =>
    (previous as Record<string, unknown>)[key] === value
  );
