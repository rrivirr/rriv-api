import type { WorkHandler } from "pg-boss";
import logger from "../../winston.ts";
import authServiceAxios from "../axios/auth-service.ts";
import { TYPES } from "./constants.ts";
import { JobDto } from "./types.ts";
import { getM2MToken } from "../keycloak/keycloak.ts";
import { serializeError } from "../../utils/log-error.ts";

export const worker: WorkHandler<JobDto> = async ([job]) => {
  const workerLogger = logger.child({ source: "pgBossWorker" });
  workerLogger.info({ jobId: job.id, status: "processing" });

  const message = job.data;
  switch (message.type) {
    case TYPES.AUTH_SERVICE_WRITE: {
      const { writes, deletes } = message.payload;
      if (deletes?.length || writes?.length) {
        try {
          const token = await getM2MToken(true);
          await authServiceAxios.post(
            `/relationship`,
            { ...message.payload },
            { headers: { Authorization: `Bearer ${token}` } },
          );
          workerLogger.info({ jobId: job.id, status: "processed" });
        } catch (error) {
          workerLogger.error({
            jobId: job.id,
            status: "failed",
            type: message.type,
            payload: message.payload,
            error: serializeError(error),
          });
          throw error;
        }
      } else {
        workerLogger.info({
          jobId: job.id,
          message: "empty write received",
          status: "processed",
        });
      }
      break;
    }

    default: {
      workerLogger.error({ job, message: "invalid job received" });
      break;
    }
  }
};
