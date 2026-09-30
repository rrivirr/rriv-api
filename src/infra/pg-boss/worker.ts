import type { WorkHandler } from "pg-boss";
import logger from "../../winston.ts";
import { DLQ_NAME, TYPES } from "./constants.ts";
import { JobDto } from "./types.ts";
import { serializeError } from "../../utils/log-error.ts";
import {
  applyAuthorizationSync,
  type AuthResource,
  isPermanentAuthError,
  notifySyncFailure,
  recordSyncFailure,
} from "../../service/authorization-sync.service.ts";
import { sendMessage } from "./pg-boss.ts";

export const worker: WorkHandler<JobDto> = async ([job]) => {
  const workerLogger = logger.child({ source: "pgBossWorker" });
  workerLogger.info({ jobId: job.id, status: "processing" });

  const message = job.data;
  switch (message.type) {
    case TYPES.AUTH_SYNC: {
      const { resourceType, resourceId, version } = message.payload;
      const resource: AuthResource = { type: resourceType, id: resourceId };
      try {
        const result = await applyAuthorizationSync(resource);
        workerLogger.info({
          jobId: job.id,
          status: "processed",
          resource: `${resourceType}:${resourceId}`,
          version,
          ...result,
        });
      } catch (error) {
        await recordSyncFailure(resource, error);
        workerLogger.error({
          jobId: job.id,
          status: "failed",
          resource: `${resourceType}:${resourceId}`,
          error: serializeError(error),
        });
        if (isPermanentAuthError(error)) {
          // Deterministic failure: park it for ops instead of burning retries,
          // and tell the owner.
          await sendMessage(DLQ_NAME, message, {});
          await notifySyncFailure(resource, error);
          return;
        }
        throw error;
      }
      break;
    }

    default: {
      workerLogger.error({ job, message: "invalid job received" });
      break;
    }
  }
};
