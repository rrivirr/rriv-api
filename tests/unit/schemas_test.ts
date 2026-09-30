import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  createContextSchema,
  shareSchema,
  updateContextSchema,
} from "../../src/handler/context/schema.ts";
import { createDeviceContextSchema } from "../../src/handler/device-context/schema.ts";
import { grantAdminSchema } from "../../src/handler/admin/schema.ts";
import { saveConfigSnapshotSchema } from "../../src/handler/config-snapshot/schema.ts";
import { createSensorDriverSchema } from "../../src/handler/sensor/schema.ts";

Deno.test("createContextSchema normalizes and bounds the name", () => {
  assertEquals(
    createContextSchema.parse({ name: "  Hello World  " }).name,
    "hello world",
  );
  assertThrows(() => createContextSchema.parse({ name: "ab" }));
  assertThrows(() => createContextSchema.parse({ name: "x".repeat(21) }));
  assertThrows(() => createContextSchema.parse({ name: "valid", extra: 1 }));
});

Deno.test("updateContextSchema requires at least one change", () => {
  assertEquals(updateContextSchema.parse({ end: true }), { end: true });
  assertThrows(() => updateContextSchema.parse({}));
});

Deno.test("shareSchema requires an email", () => {
  assertEquals(shareSchema.parse({ email: "a@b.co" }), { email: "a@b.co" });
  assertThrows(() => shareSchema.parse({ email: "not-an-email" }));
});

Deno.test("createDeviceContextSchema normalizes the assigned name", () => {
  assertEquals(
    createDeviceContextSchema.parse({ assignedDeviceName: "  Pump 1  " })
      .assignedDeviceName,
    "pump 1",
  );
});

Deno.test("grantAdminSchema requires an email", () => {
  assertEquals(grantAdminSchema.parse({ email: "admin@rriv.org" }), {
    email: "admin@rriv.org",
  });
  assertThrows(() => grantAdminSchema.parse({ email: "nope" }));
  assertThrows(() => grantAdminSchema.parse({ email: "a@b.co", extra: true }));
});

Deno.test("saveConfigSnapshotSchema validates ids", () => {
  const body = {
    name: "snapshot",
    deviceId: crypto.randomUUID(),
    contextId: crypto.randomUUID(),
  };
  assertEquals(saveConfigSnapshotSchema.parse(body), body);
  assertThrows(() =>
    saveConfigSnapshotSchema.parse({ ...body, deviceId: "nope" })
  );
});

Deno.test("createSensorDriverSchema validates the JSON schema payload", () => {
  assert(
    createSensorDriverSchema.parse({
      name: "ds18b20",
      validation: { type: "object" },
    }),
  );
  assertThrows(() =>
    createSensorDriverSchema.parse({ name: "ds18b20", validation: {} })
  );
});
