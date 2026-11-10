import { assertEquals } from "@std/assert";
import http from "node:http";
import { createShutdown } from "../../src/utils/graceful-shutdown.ts";

const fakeServer = (calls: string[]) => ({
  close: (callback?: (error?: Error) => void) => {
    calls.push("http server");
    callback?.();
    return undefined as never;
  },
});

Deno.test("shutdown closes http, then workers, then database, and exits 0", async () => {
  const calls: string[] = [];
  const exits: number[] = [];
  const shutdown = createShutdown({
    server: fakeServer(calls),
    stopWorkers: () => Promise.resolve(calls.push("job workers")),
    disconnect: () => Promise.resolve(calls.push("database")),
    exit: (code) => exits.push(code),
  });

  await shutdown("SIGTERM");

  assertEquals(calls, ["http server", "job workers", "database"]);
  assertEquals(exits, [0]);
});

Deno.test("shutdown runs once even if the signal repeats", async () => {
  const calls: string[] = [];
  const exits: number[] = [];
  const shutdown = createShutdown({
    server: fakeServer(calls),
    stopWorkers: () => Promise.resolve(calls.push("job workers")),
    disconnect: () => Promise.resolve(calls.push("database")),
    exit: (code) => exits.push(code),
  });

  await Promise.all([
    shutdown("SIGTERM"),
    shutdown("SIGTERM"),
    shutdown("SIGINT"),
  ]);

  assertEquals(calls, ["http server", "job workers", "database"]);
  assertEquals(exits, [0]);
});

Deno.test("a failed step doesn't stop later steps, and exits 1", async () => {
  const calls: string[] = [];
  const exits: number[] = [];
  const shutdown = createShutdown({
    server: fakeServer(calls),
    stopWorkers: () => Promise.reject(new Error("boom")),
    disconnect: () => Promise.resolve(calls.push("database")),
    exit: (code) => exits.push(code),
  });

  await shutdown("SIGTERM");

  assertEquals(calls, ["http server", "database"]);
  assertEquals(exits, [1]);
});

Deno.test("shutdown exits 1 when a step hangs past the timeout", async () => {
  const exits: number[] = [];
  let release!: () => void;
  const hang = new Promise<void>((resolve) => (release = resolve));
  const shutdown = createShutdown({
    server: fakeServer([]),
    stopWorkers: () => hang,
    disconnect: () => Promise.resolve(),
    timeoutMs: 50,
    exit: (code) => exits.push(code),
  });

  await shutdown("SIGTERM");
  assertEquals(exits, [1]);

  // Let the hanging step finish so the test leaks no pending work.
  release();
  await hang;
});

Deno.test("an in-flight request completes before the server finishes closing", async () => {
  let finishRequest!: () => void;
  const requestStarted = Promise.withResolvers<void>();
  const server = http.createServer((_req, res) => {
    requestStarted.resolve();
    finishRequest = () => res.end("done");
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as { port: number };

  const response = fetch(`http://127.0.0.1:${port}/`);
  await requestStarted.promise;

  const exits: number[] = [];
  const shutdown = createShutdown({
    server,
    stopWorkers: () => Promise.resolve(),
    disconnect: () => Promise.resolve(),
    exit: (code) => exits.push(code),
  });
  const done = shutdown("SIGTERM");

  // Still waiting on the open request.
  await new Promise((resolve) => setTimeout(resolve, 50));
  assertEquals(exits, []);

  finishRequest();
  assertEquals(await (await response).text(), "done");
  await done;
  assertEquals(exits, [0]);
});
