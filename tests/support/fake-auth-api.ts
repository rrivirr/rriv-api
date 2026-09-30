/**
 * In-process fake auth-api: an in-memory relationship store that implements
 * just enough of the auth-api contract (and the RRIV authorization model) for
 * integration tests:
 *
 *   - enforces a bearer token whose `azp` is accepted (like the real
 *     jwtMiddleware) — this is what catches an unauthenticated caller
 *   - evaluates the direct and derived relations the app checks
 *     (owner/editor/system/admin, can_edit, can_write)
 *   - supports failure injection for the transient (5xx) / permanent (4xx)
 *     worker paths
 */
// @deno-types="npm:@types/express@5"
import express from "npm:express";

export type Tuple = { user: string; relation: string; object: string };

const ALLOWED_AZP = ["auth-api", "rrivctl", "rriv-web"];
const SEP = "\u0000";
const keyOf = (t: Tuple) => `${t.user}${SEP}${t.relation}${SEP}${t.object}`;

const decodeJwtPayload = (
  token: string,
): Record<string, unknown> | null => {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
};

export interface FakeAuthApi {
  seed: (tuples: Tuple[]) => void;
  has: (user: string, relation: string, object: string) => boolean;
  tuples: () => Tuple[];
  /** Queue HTTP statuses returned before the real handler (e.g. [503]). */
  failNext: (statuses: number[]) => void;
  reset: () => void;
  stop: () => Promise<void>;
}

export const startFakeAuthApi = async (port: number): Promise<FakeAuthApi> => {
  const store = new Set<string>();
  const failures: number[] = [];

  const toTuple = (key: string): Tuple => {
    const [user, relation, object] = key.split(SEP);
    return { user, relation, object };
  };
  const allTuples = (): Tuple[] => [...store].map(toTuple);
  const has = (user: string, relation: string, object: string): boolean =>
    store.has(keyOf({ user, relation, object }));
  const usersOf = (object: string, relation: string): string[] =>
    allTuples()
      .filter((t) => t.object === object && t.relation === relation)
      .map((t) => t.user);
  const objectsOfType = (type: string): string[] => {
    const set = new Set<string>();
    for (const t of allTuples()) {
      if (t.object.startsWith(`${type}:`)) set.add(t.object);
      if (t.user.startsWith(`${type}:`)) set.add(t.user);
    }
    return [...set];
  };

  const canEditContext = (user: string, context: string): boolean =>
    has(user, "owner", context) ||
    has(user, "editor", context) ||
    usersOf(context, "system").some((system) => has(user, "admin", system));

  const canWriteDevice = (user: string, device: string): boolean =>
    has(user, "owner", device) ||
    has(user, "writer", device) ||
    usersOf(device, "system").some((system) => has(user, "admin", system)) ||
    usersOf(device, "context").some((context) => canEditContext(user, context));

  const check = (user: string, relation: string, object: string): boolean => {
    const type = object.split(":")[0];
    if (type === "context" && relation === "can_edit") {
      return canEditContext(user, object);
    }
    if (type === "device" && relation === "can_write") {
      return canWriteDevice(user, object);
    }
    return has(user, relation, object);
  };

  const apply = (writes: Tuple[] = [], deletes: Tuple[] = []): void => {
    for (const tuple of deletes) store.delete(keyOf(tuple));
    for (const tuple of writes) store.add(keyOf(tuple));
  };

  const app = express();
  app.use(express.json());

  // Bearer auth, like auth-api's jwtMiddleware.
  app.use((req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({
        code: 401,
        message: "invalid access token",
      });
    }
    const payload = decodeJwtPayload(header.slice("Bearer ".length));
    if (!payload || !ALLOWED_AZP.includes(String(payload.azp))) {
      return res.status(401).json({
        code: 401,
        message: "invalid access token",
      });
    }
    next();
  });

  // Failure injection (after auth, before the handlers).
  app.use((_req, res, next) => {
    const status = failures.shift();
    if (status) {
      return res.status(status).json({ code: status, message: "injected" });
    }
    next();
  });

  app.post("/check", (req, res) => {
    const { user, relation, object } = req.body ?? {};
    res.json({ allowed: check(user, relation, object) });
  });

  app.post("/relationship", (req, res) => {
    apply(req.body?.writes, req.body?.deletes);
    res.json({ message: "successful" });
  });

  app.post("/list-objects", (req, res) => {
    const { user, relation, type } = req.body ?? {};
    res.json({
      objects: objectsOfType(type).filter((object) =>
        check(user, relation, object)
      ),
    });
  });

  app.post("/list-users", (req, res) => {
    const { objectType, relation, id, userType } = req.body ?? {};
    const object = `${objectType}:${id}`;
    const users = usersOf(object, relation)
      .filter((user) => user.startsWith(`${userType}:`))
      .map((user) => ({
        object: { type: userType, id: user.slice(userType.length + 1) },
      }));
    res.json({ users });
  });

  app.post("/read", (req, res) => {
    const { user, relation, object } = req.body ?? {};
    const tuples = allTuples()
      .filter((t) =>
        (user === undefined || t.user === user) &&
        (relation === undefined || t.relation === relation) &&
        (object === undefined || t.object === object)
      )
      .map((t) => ({ key: t, timestamp: new Date().toISOString() }));
    res.json({ tuples });
  });

  app.post("/read-resource", (req, res) => {
    const { type, id } = req.body ?? {};
    const key = `${type}:${id}`;
    const seen = new Set<string>();
    const tuples: Tuple[] = [];
    for (const t of allTuples()) {
      if (t.user === key || t.object === key) {
        if (!seen.has(keyOf(t))) {
          seen.add(keyOf(t));
          tuples.push(t);
        }
      }
    }
    res.json({ tuples });
  });

  const server = app.listen(port);
  await new Promise<void>((resolve) => server.once("listening", resolve));

  return {
    seed: (tuples) => apply(tuples, []),
    has,
    tuples: allTuples,
    failNext: (statuses) => failures.push(...statuses),
    reset: () => {
      store.clear();
      failures.length = 0;
    },
    stop: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
};
