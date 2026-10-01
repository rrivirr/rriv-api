import type { PgBoss, Queue } from "npm:pg-boss";
import { DLQ_NAME, QUEUE_NAME } from "./constants.ts";

export type QueueOptions = Omit<Queue, "name">;

export const DLQ_OPTIONS: QueueOptions = {
  policy: "standard",
  retryLimit: 0,
  retentionSeconds: 30 * 24 * 60 * 60,
};

export const QUEUE_OPTIONS: QueueOptions = {
  policy: "stately",
  retryLimit: 5,
  retryDelay: 15,
  retryBackoff: true,
  retryDelayMax: 60 * 60,
  deadLetter: DLQ_NAME,
};

export const createQueues = async (boss: PgBoss): Promise<void> => {
  await boss.createQueue(DLQ_NAME, DLQ_OPTIONS);
  await boss.createQueue(QUEUE_NAME, QUEUE_OPTIONS);
};

/**
 * Delete and recreate both queues to effect queue policy changes
 */
export const recreateQueues = async (boss: PgBoss): Promise<void> => {
  await boss.deleteQueue(QUEUE_NAME);
  await boss.deleteQueue(DLQ_NAME);
  await createQueues(boss);
};
