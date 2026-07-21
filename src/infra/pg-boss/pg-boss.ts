import { PgBoss, SendOptions } from "npm:pg-boss";
import logger from "../../winston.ts";
import { JobDto } from "./types.ts";

const connectionString = Deno.env.get("DATABASE_URL")?.split("schema=")[0];
const pgBoss = new PgBoss({
  connectionString: connectionString!,
  persistWarnings: true,
  warningRetentionDays: 60,
});
const pgBossLogger = logger.child({ source: "pgBoss" });

pgBoss.on("error", (error) => pgBossLogger.error(error));

pgBoss.on("warning", ({ message, data }) => {
  pgBossLogger.warn("pg-boss warning:", message, data);
});

export const sendMessage = async (
  queueName: string,
  message: JobDto,
  options: SendOptions,
) => {
  await pgBoss.send(queueName, message, options);
};
export default pgBoss;
