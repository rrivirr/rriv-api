/**
 * In-process fake data-api: records each `POST /readings` (its
 * Authorization header and window list) and answers with canned readings.
 * Started once per process, like the other fakes.
 */
// @deno-types="npm:@types/express@5"
import express from "npm:express";
import { DATA_API_PORT } from "./env.ts";

export interface DataApiRequest {
  authorization: string | undefined;
  body: {
    windows: { eui: string; start: string; end: string | null }[];
    format: "json" | "csv";
    limit: number;
    offset: number;
    order: "asc" | "desc";
  };
}

export interface FakeDataApi {
  requests: DataApiRequest[];
  /** Rows returned for JSON requests. */
  setReadings: (readings: unknown[]) => void;
  reset: () => void;
}

let shared: FakeDataApi | null = null;

export const startFakeDataApi = async (): Promise<FakeDataApi> => {
  if (shared) return shared;
  const requests: DataApiRequest[] = [];
  let readings: unknown[] = [];

  const app = express();
  app.post("/readings", express.json(), (req, res) => {
    requests.push({
      authorization: req.headers.authorization,
      body: req.body,
    });
    if (req.body.format === "csv") {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.send("temperature,timestamp\n21.5,2026-01-05T00:00:00.000Z\n");
      return;
    }
    res.json(readings);
  });

  const server = app.listen(DATA_API_PORT);
  await new Promise<void>((resolve) => server.once("listening", resolve));

  shared = {
    requests,
    setReadings: (rows) => {
      readings = rows;
    },
    reset: () => {
      requests.length = 0;
      readings = [];
    },
  };
  return shared;
};
