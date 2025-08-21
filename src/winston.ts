import winston from "npm:winston";

const logLevel = Deno.env.get("LOG_LEVEL") ?? "info";

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.simple(),
  ),
  level: logLevel,
  transports: [
    new winston.transports.Console({
      format: winston.format.logstash(),
    }),
  ],
});

export default logger;
