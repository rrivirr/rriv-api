/**
 * Starts the real express app (importing `src/app.ts` also boots pg-boss and
 * registers the worker) on an ephemeral port and returns fetch helpers.
 */
import app from "../../src/app.ts";

export { app };

export interface RunningServer {
  url: string;
  close: () => Promise<void>;
}

export const listen = (): Promise<RunningServer> =>
  new Promise((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address() as { port: number };
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        close: () => new Promise<void>((done) => server.close(() => done())),
      });
    });
  });

export const apiFetch = (
  base: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> => {
  const headers = new Headers(init.headers);
  const method = (init.method ?? "GET").toUpperCase();
  const sendsBody = method === "POST" || method === "PATCH" || method === "PUT";
  // The API rejects any POST/PATCH/PUT without application/json, even with no
  // body (mirrors the web client).
  if ((init.body !== undefined || sendsBody) && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return fetch(`${base}${path}`, { ...init, headers });
};
