import type { WorkHandler } from "pg-boss";
import logger from "../../winston.ts";
import authServiceAxios from "../axios/auth-service.ts";
import { AxiosError } from "axios";
import { TYPES } from "./constants.ts";
import { JobDto } from "./types.ts";

export const worker: WorkHandler<JobDto> = async ([job]) => {
  const workerLogger = logger.child({ source: "pgBossWorker" });
  workerLogger.info({ jobId: job.id, status: "processing" });

  const message = job.data;
  switch (message.type) {
    case TYPES.AUTH_SERVICE_WRITE: {
      const { writes, deletes } = message.payload;
      if (deletes?.length || writes?.length) {
        try {
          await authServiceAxios.post(`/relationship`, {
            ...message.payload,
          });
          workerLogger.info({ jobId: job.id, status: "processed" });
        } catch (error) {
          if (error instanceof AxiosError) {
            workerLogger.warn({
              jobId: job.id,
              status: "failed",
              error: error.response?.data,
            });
            throw error;
          } else {
            workerLogger.warn({ jobId: job.id, status: "failed", error });
            throw error;
          }
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
