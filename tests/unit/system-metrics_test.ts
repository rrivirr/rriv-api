import { assertEquals } from "@std/assert";
import {
  OUTSTANDING_JOB_STATES,
  outstandingJobCount,
} from "../../src/service/system-metrics.service.ts";

Deno.test("OUTSTANDING_JOB_STATES is created/retry/active", () => {
  assertEquals([...OUTSTANDING_JOB_STATES].sort(), [
    "active",
    "created",
    "retry",
  ]);
});

Deno.test("outstandingJobCount counts only unfinished jobs", () => {
  const rows = [
    { state: "created", count: 2, oldest_seconds: 5 },
    { state: "retry", count: 1, oldest_seconds: 5 },
    { state: "active", count: 1, oldest_seconds: 5 },
    // Terminal states are retained by pg-boss as history — not outstanding.
    { state: "completed", count: 10, oldest_seconds: null },
    { state: "cancelled", count: 4, oldest_seconds: null },
    { state: "failed", count: 3, oldest_seconds: null },
  ];

  assertEquals(outstandingJobCount(rows), 4);
});

Deno.test("outstandingJobCount is 0 when only terminal rows exist", () => {
  assertEquals(
    outstandingJobCount([
      { state: "completed", count: 7, oldest_seconds: null },
    ]),
    0,
  );
});
