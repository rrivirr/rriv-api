import winston from "npm:winston";

const logLevel = Deno.env.get("LOG_LEVEL") ?? "info";

const logger = winston.createLogger({
  level: logLevel,
  transports: [
    new winston.transports.Console({
      format: winston.format.logstash(),
    }),
  ],
});

export default logger;
