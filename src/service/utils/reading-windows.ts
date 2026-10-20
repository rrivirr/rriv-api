/**
 * Which stretches of a device's readings a caller may read
 *
 * Readings are always limited to times when an EUI belonged to the device.
 * Within that, a caller sees:
 * - their own ownership periods (`Bind`);
 * - the device's time in a context they currently belong to (shared), within the
 *   owner's period (any bind); they keep that time after the device leaves;
 * - everything, if they're an admin.
 *
 * Pure: callers load the records and this works out the windows.
 */

export interface Period {
  start: Date;
  // null = still open
  end: Date | null;
}

export interface EuiPeriod extends Period {
  eui: string;
}

export interface BindPeriod extends Period {
  accountId: string;
}

/** Readings from `start` (inclusive) to `end` (exclusive). */
export interface ReadingWindow {
  eui: string;
  start: Date;
  /** Exclusive; null = open-ended (up to now). */
  end: Date | null;
}

export interface ReadingAccessInput {
  callerId: string;
  isAdmin: boolean;
  euiPeriods: EuiPeriod[];
  /** Every (non-archived) bind of the device, any owner. */
  binds: BindPeriod[];
  /** The device's periods in contexts the caller belongs to. */
  contextPeriods: Period[];
}

/** Half-open [start, end) in ms; end = Infinity when open. */
type Span = [number, number];

const toSpan = ({ start, end }: Period): Span => [
  start.getTime(),
  end ? end.getTime() : Infinity,
];

const fromSpan = ([start, end]: Span): Period => ({
  start: new Date(start),
  end: end === Infinity ? null : new Date(end),
});

/** Sort and merge overlapping or touching spans; drop empty ones. */
export const unionSpans = (spans: Span[]): Span[] => {
  const sorted = spans
    .filter(([start, end]) => end > start)
    .sort((a, b) => a[0] - b[0]);
  const merged: Span[] = [];
  for (const span of sorted) {
    const last = merged[merged.length - 1];
    if (last && span[0] <= last[1]) {
      last[1] = Math.max(last[1], span[1]);
    } else {
      merged.push([...span]);
    }
  }
  return merged;
};

/** Intersection of two unions of spans. */
export const intersectSpans = (a: Span[], b: Span[]): Span[] => {
  const left = unionSpans(a);
  const right = unionSpans(b);
  const result: Span[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    const start = Math.max(left[i][0], right[j][0]);
    const end = Math.min(left[i][1], right[j][1]);
    if (end > start) result.push([start, end]);
    if (left[i][1] < right[j][1]) i++;
    else j++;
  }
  return result;
};

export const computeReadingWindows = (
  input: ReadingAccessInput,
): ReadingWindow[] => {
  const allowed: Span[] = input.isAdmin ? [[-Infinity, Infinity]] : unionSpans([
    ...input.binds
      .filter((bind) => bind.accountId === input.callerId)
      .map(toSpan),
    ...intersectSpans(
      input.contextPeriods.map(toSpan),
      input.binds.map(toSpan),
    ),
  ]);

  // Group EUI periods by EUI, so a re-assigned EUI yields merged windows.
  const byEui = new Map<string, Span[]>();
  for (const period of input.euiPeriods) {
    byEui.set(period.eui, [...(byEui.get(period.eui) ?? []), toSpan(period)]);
  }

  const windows: ReadingWindow[] = [];
  for (const [eui, spans] of byEui) {
    for (const span of intersectSpans(spans, allowed)) {
      windows.push({ eui, ...fromSpan(span) });
    }
  }
  return windows.sort((a, b) => a.start.getTime() - b.start.getTime());
};

/**
 * Limit windows to a requested time range. The user's `rangeEnd` is
 * inclusive, so it becomes an exclusive bound one millisecond later.
 */
export const clipWindows = (
  windows: ReadingWindow[],
  range: { start: Date; end?: Date },
): ReadingWindow[] => {
  const rangeSpan: Span = [
    range.start.getTime(),
    range.end ? range.end.getTime() + 1 : Infinity,
  ];
  return windows.flatMap((window) =>
    intersectSpans([toSpan(window)], [rangeSpan]).map((span) => ({
      eui: window.eui,
      ...fromSpan(span),
    }))
  );
};
