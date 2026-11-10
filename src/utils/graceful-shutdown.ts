import type { Server } from "node:http";
import logger from "../winston.ts";
import { serializeError } from "./log-error.ts";

type Step = { name: string; run: () => Promise<unknown> };

export type ShutdownDeps = {
  server: Pick<Server, "close"> & { closeIdleConnections?: () => void };
  /** Stops job workers; runs after the HTTP server stops taking requests. */
  stopWorkers: () => Promise<unknown>;
  /** Closes database clients; runs last, once nothing else needs them. */
  disconnect: () => Promise<unknown>;
  /** Hard limit; stays under Kubernetes' default 30s grace period. */
  timeoutMs?: number;
  exit?: (code: number) => void;
};

const closeServer = (server: ShutdownDeps["server"]) =>
  new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    // Keep-alive sockets with no request in flight would otherwise hold
    // close() open until they time out.
    server.closeIdleConnections?.();
  });

/**
 * Returns a signal handler that stops taking HTTP requests, lets in-flight
 * requests and jobs finish, closes database clients, then exits. Repeated
 * signals are ignored; if shutdown takes longer than `timeoutMs` the process
 * exits anyway with code 1.
 */
export const createShutdown = ({
  server,
  stopWorkers,
  disconnect,
  timeoutMs = 25_000,
  exit = (code) => Deno.exit(code),
}: ShutdownDeps) => {
  let started: Promise<void> | null = null;

  return (signal: string): Promise<void> => {
    if (started) {
      return started;
    }

    logger.info({ message: "shutting down", signal });

    const steps: Step[] = [
      { name: "http server", run: () => closeServer(server) },
      { name: "job workers", run: stopWorkers },
      { name: "database", run: disconnect },
    ];

    const run = async () => {
      let failed = false;
      for (const step of steps) {
        try {
          await step.run();
        } catch (error) {
          // Keep going: a failed step shouldn't stop the others from closing.
          failed = true;
          logger.error({
            message: `shutdown: closing ${step.name} failed`,
            error: serializeError(error),
          });
        }
      }
      return failed ? 1 : 0;
    };

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<number>((resolve) => {
      timer = setTimeout(() => {
        logger.error({ message: "shutdown timed out", timeoutMs });
        resolve(1);
      }, timeoutMs);
    });

    started = Promise.race([run(), timeout]).then((code) => {
      clearTimeout(timer);
      if (code === 0) {
        logger.info({ message: "shutdown complete" });
      }
      exit(code);
    });
    return started;
  };
};
