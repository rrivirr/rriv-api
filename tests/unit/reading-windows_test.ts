import { assertEquals } from "@std/assert";
import {
  clipWindows,
  computeReadingWindows,
  intersectSpans,
  unionSpans,
} from "../../src/service/utils/reading-windows.ts";

const d = (day: number) => new Date(Date.UTC(2026, 0, day));
const fmt = (windows: { eui: string; start: Date; end: Date | null }[]) =>
  windows.map((w) =>
    `${w.eui}:${w.start.getUTCDate()}-${w.end ? w.end.getUTCDate() : "open"}`
  );

Deno.test("unionSpans merges overlapping and touching spans", () => {
  assertEquals(unionSpans([[5, 8], [1, 3], [3, 4], [7, 10], [12, 12]]), [
    [1, 4],
    [5, 10],
  ]);
});

Deno.test("intersectSpans keeps only the overlap", () => {
  assertEquals(intersectSpans([[1, 5], [8, 12]], [[3, 9], [11, Infinity]]), [
    [3, 5],
    [8, 9],
    [11, 12],
  ]);
});

const base = {
  euiPeriods: [
    { eui: "E1", start: d(1), end: d(10) },
    { eui: "E2", start: d(10), end: null },
  ],
  binds: [
    { accountId: "alice", start: d(2), end: d(6) },
    { accountId: "bob", start: d(6), end: null },
  ],
  contextPeriods: [],
};

Deno.test("owners see their own bind periods, split by EUI", () => {
  assertEquals(
    fmt(
      computeReadingWindows({ ...base, callerId: "alice", isAdmin: false }),
    ),
    ["E1:2-6"],
  );
  assertEquals(
    fmt(computeReadingWindows({ ...base, callerId: "bob", isAdmin: false })),
    ["E1:6-10", "E2:10-open"],
  );
});

Deno.test("context members see the context time within an owner's period", () => {
  // Device in carol's context from day 4 to day 12; device unbound days 1-2.
  const windows = computeReadingWindows({
    ...base,
    callerId: "carol",
    isAdmin: false,
    contextPeriods: [{ start: d(1), end: d(12) }],
  });
  assertEquals(fmt(windows), ["E1:2-10", "E2:10-12"]);
});

Deno.test("strangers see nothing; admins see every EUI period", () => {
  assertEquals(
    computeReadingWindows({ ...base, callerId: "mallory", isAdmin: false }),
    [],
  );
  assertEquals(
    fmt(
      computeReadingWindows({ ...base, callerId: "mallory", isAdmin: true }),
    ),
    ["E1:1-10", "E2:10-open"],
  );
});

Deno.test("an EUI re-assigned to the device later merges per EUI", () => {
  const windows = computeReadingWindows({
    callerId: "alice",
    isAdmin: false,
    euiPeriods: [
      { eui: "E1", start: d(1), end: d(3) },
      { eui: "E2", start: d(3), end: d(5) },
      { eui: "E1", start: d(5), end: null },
    ],
    binds: [{ accountId: "alice", start: d(1), end: null }],
    contextPeriods: [],
  });
  assertEquals(fmt(windows), ["E1:1-3", "E2:3-5", "E1:5-open"]);
});

Deno.test("clipWindows limits windows to the requested range", () => {
  const windows = [
    { eui: "E1", start: d(1), end: d(10) },
    { eui: "E2", start: d(10), end: null },
  ];
  assertEquals(fmt(clipWindows(windows, { start: d(8), end: d(12) })), [
    "E1:8-10",
    "E2:10-12",
  ]);
  assertEquals(fmt(clipWindows(windows, { start: d(11) })), ["E2:11-open"]);
  assertEquals(clipWindows(windows, { start: d(20), end: d(21) }).length, 1);
});

Deno.test("clipWindows keeps a reading at exactly rangeEnd", () => {
  // Windows end exclusively, so the user's inclusive rangeEnd becomes +1 ms.
  const [window] = clipWindows([{ eui: "E1", start: d(1), end: null }], {
    start: d(2),
    end: d(5),
  });
  assertEquals(window.end!.getTime(), d(5).getTime() + 1);
});

Deno.test("an ownership handover leaves no overlap between owners", () => {
  const alice = computeReadingWindows({
    ...base,
    callerId: "alice",
    isAdmin: false,
  });
  const bob = computeReadingWindows({
    ...base,
    callerId: "bob",
    isAdmin: false,
  });
  // alice's last window ends exactly where bob's first starts; with
  // [start, end) windows the reading at that instant is bob's only.
  assertEquals(alice[alice.length - 1].end!.getTime(), bob[0].start.getTime());
});
