import dataServiceAxios from "../infra/axios/data-service.ts";
import * as deviceRepository from "../repository/device.repository.ts";
import { HttpException } from "../utils/http-exception.ts";
import { authorizationCheck, isAdmin, listObjects } from "./auth.service.ts";
import {
  clipWindows,
  computeReadingWindows,
  type ReadingWindow,
} from "./utils/reading-windows.ts";
import type { ReadingsQuery } from "../handler/readings/schema.ts";

export type ReadingsResult =
  | { format: "json"; readings: unknown[] }
  | { format: "csv"; csv: Uint8Array; fileName: string };

export const getReadingWindows = async ({
  accountId,
  deviceId,
}: {
  accountId: string;
  deviceId: string;
}): Promise<ReadingWindow[]> => {
  const device = await deviceRepository.getReadingAccessRecords(deviceId);
  if (!device) {
    throw new HttpException(404, "device not found");
  }

  const admin = await isAdmin(accountId);
  const contextIds = admin ? new Set<string>() : new Set(
    await listObjects({
      user: `user:${accountId}`,
      type: "context",
      relation: "can_edit",
    }),
  );

  const windows = computeReadingWindows({
    callerId: accountId,
    isAdmin: admin,
    euiPeriods: device.DeviceEuis.map((record) => ({
      eui: record.eui,
      start: record.createdAt,
      end: record.deactivatedAt ?? (record.active ? null : record.createdAt),
    })),
    binds: device.Bind.map((bind) => ({
      accountId: bind.accountId,
      start: bind.boundAt,
      end: bind.unboundAt,
    })),
    contextPeriods: device.DeviceContext.filter((placement) =>
      contextIds.has(placement.contextId)
    ).map((placement) => ({
      start: placement.startedAt,
      end: placement.endedAt,
    })),
  });

  if (!windows.length && !admin) {
    // no valid window of data found for user
    // if user has current access to device; return empty array
    // This check occurs after because it is possible for a user to have access to
    // have access to previous data but not the device at the moment
    try {
      await authorizationCheck({
        user: `user:${accountId}`,
        object: `device:${deviceId}`,
        relation: "can_write",
      });
    } catch (error) {
      if (error instanceof HttpException && error.code === 403) {
        throw new HttpException(404, "device not found");
      }
      throw error;
    }
  }
  return windows;
};

export const getDeviceReadings = async ({
  accountId,
  deviceId,
  query,
}: {
  accountId: string;
  deviceId: string;
  query: ReadingsQuery;
}): Promise<ReadingsResult> => {
  const windows = clipWindows(
    await getReadingWindows({ accountId, deviceId }),
    { start: query.rangeStart, end: query.rangeEnd },
  );

  if (!windows.length) {
    if (query.format === "csv") {
      throw new HttpException(
        404,
        "no data found for the specified parameters",
      );
    }
    return { format: "json", readings: [] };
  }

  const body = {
    windows: windows.map((window) => ({
      eui: window.eui,
      start: window.start.toISOString(),
      end: window.end?.toISOString() ?? null,
    })),
    format: query.format,
    limit: query.limit,
    offset: query.offset,
    order: query.order,
  };

  if (query.format === "json") {
    const response = await dataServiceAxios.post<unknown[]>("/readings", body);
    return { format: "json", readings: response.data };
  }

  const response = await dataServiceAxios.post<ArrayBuffer>("/readings", body, {
    responseType: "arraybuffer",
    validateStatus: (s) => s < 500,
  });
  if (response.status === 404) {
    throw new HttpException(404, "no data found for the specified parameters");
  }
  if (response.status >= 400) {
    throw new HttpException(502, "data-api rejected the request");
  }
  const range = [
    query.rangeStart.toISOString(),
    query.rangeEnd?.toISOString() ?? "",
  ].join("_");
  return {
    format: "csv",
    csv: new Uint8Array(response.data),
    fileName: `${deviceId}_${range}_readings.csv`,
  };
};
