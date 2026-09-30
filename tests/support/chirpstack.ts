import type { ChirpstackConnection } from "../../src/infra/chirpstack.ts";
import {
  resetChirpstackConnectionFactory,
  setChirpstackConnectionFactory,
} from "../../src/infra/chirpstack.ts";

type GrpcResponse = { toObject: () => unknown; getId: () => string };
type GrpcCallback = (err: unknown, response?: GrpcResponse) => void;

const grpcResponse: GrpcResponse = {
  toObject: () => ({}),
  getId: () => "response-id",
};

export interface FakeChirpstack {
  created: unknown[];
  enqueued: unknown[];
  restore: () => void;
}

/** Installs a fake ChirpStack gRPC client for the duration of a test. */
export const installFakeChirpstack = (options?: {
  applications?: { id: string; name: string }[];
  deviceProfile?: { id: string };
}): FakeChirpstack => {
  const created: unknown[] = [];
  const enqueued: unknown[] = [];
  const applications = options?.applications ?? [{ id: "app-1", name: "rriv" }];
  const deviceProfile = options?.deviceProfile ?? { id: "profile-1" };

  const connection = {
    metadata: {},
    getApplications: () => Promise.resolve(applications),
    getDeviceProfile: () => Promise.resolve(deviceProfile),
    deviceService: {
      create: (
        request: unknown,
        _metadata: unknown,
        callback: GrpcCallback,
      ) => {
        created.push(request);
        callback(null, grpcResponse);
      },
      enqueue: (
        request: unknown,
        _metadata: unknown,
        callback: GrpcCallback,
      ) => {
        enqueued.push(request);
        callback(null, grpcResponse);
      },
      close: () => {},
    },
    applicationService: { close: () => {} },
    deviceProfileService: { close: () => {} },
    closeConnection: () => {},
  } as unknown as ChirpstackConnection;

  setChirpstackConnectionFactory(() => connection);
  return {
    created,
    enqueued,
    restore: () => resetChirpstackConnectionFactory(),
  };
};
