import { assertEquals } from "@std/assert";
import { DLQ_OPTIONS, QUEUE_OPTIONS } from "../../src/infra/pg-boss/queues.ts";

Deno.test(
  "app queue uses stately (not key_strict_fifo) + a dead letter",
  () => {
    assertEquals(QUEUE_OPTIONS.policy, "stately");
    assertEquals(QUEUE_OPTIONS.retryLimit, 5);
    assertEquals(QUEUE_OPTIONS.deadLetter, "rriv-dlq");
  },
);

Deno.test("DLQ is a standard queue nothing processes", () => {
  assertEquals(DLQ_OPTIONS.policy, "standard");
  assertEquals(DLQ_OPTIONS.retryLimit, 0);
});
