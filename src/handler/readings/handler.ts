// @deno-types="npm:@types/express@5"
import { Request, Response } from "npm:express";
import { idSchema } from "../generic/generic.schema.ts";
import { readingsQuerySchema } from "./schema.ts";
import * as readingsService from "../../service/readings.service.ts";

export const getDeviceReadings = async (req: Request, res: Response) => {
  const accountId = req.accountId;
  const { id: deviceId } = idSchema.parse(req.params);
  const query = readingsQuerySchema.parse(req.query);

  const result = await readingsService.getDeviceReadings({
    accountId,
    deviceId,
    query,
  });

  if (result.format === "json") {
    res.json(result.readings);
    return;
  }
  res.writeHead(200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename=${result.fileName}`,
  });
  res.end(result.csv);
};
