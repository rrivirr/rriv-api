import { assertEquals } from "@std/assert";
import {
  formatDuration,
  healthReasons,
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

Deno.test("formatDuration renders compact ages", () => {
  assertEquals(formatDuration(45), "45s");
  assertEquals(formatDuration(12 * 60), "12 min");
  assertEquals(formatDuration(65 * 60), "1h 5m");
  assertEquals(formatDuration(26 * 60 * 60), "1d 2h");
});

Deno.test("healthReasons lists only the active problems", () => {
  assertEquals(
    healthReasons({
      failed: 0,
      dlqDepth: 0,
      stuckPendingSeconds: null,
      oldestQueuedSeconds: null,
    }),
    [],
  );

  // A recent queue age is below the 10-minute backlog threshold → not a reason.
  assertEquals(
    healthReasons({
      failed: 0,
      dlqDepth: 0,
      stuckPendingSeconds: null,
      oldestQueuedSeconds: 60,
    }),
    [],
  );

  assertEquals(
    healthReasons({
      failed: 2,
      dlqDepth: 1,
      stuckPendingSeconds: 1320,
      oldestQueuedSeconds: 700,
    }),
    [
      "2 resource(s) failed to sync",
      "1 job(s) parked in the dead-letter queue",
      "a sync has been pending for 22 min",
      "the oldest queued job is 11 min old",
    ],
  );
});
