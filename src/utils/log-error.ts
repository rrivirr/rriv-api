import { AxiosError } from "axios";
import config from "../infra/get-config.ts";

const SENSITIVE_KEY = /secret|password|token|authorization|cookie|api[-_]?key/i;
const PLACEHOLDER = "[redacted]";
const databasePassword = new URL(config.DATABASE_URL).password;

const KNOWN_SECRETS = [
  config.KEYCLOAK_CLIENT_SECRET,
  config.KEYCLOAK_AUTH_CLIENT_SECRET,
  databasePassword,
  databasePassword && decodeURIComponent(databasePassword),
].filter(
  (value): value is string => typeof value === "string" && value.length > 0,
);

const PATTERNS: Array<[RegExp, string]> = [
  // Authorization headers
  [/Bearer\s+[\w.\-]+/gi, `Bearer ${PLACEHOLDER}`],
  // JWTs (header.payload.signature)
  [/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, PLACEHOLDER],
  // Credentials embedded in a URL: scheme://user:password@host
  [/([a-z][a-z0-9+.-]*:\/\/[^:/@\s]+):[^@\s]+@/gi, `$1:${PLACEHOLDER}@`],
  // Form-encoded secrets: client_secret=...
  [/(client_secret=)[^&\s]+/gi, `$1${PLACEHOLDER}`],
];

/** Scrub known secret values and common secret shapes out of a string. */
export const scrubString = (value: string): string => {
  let output = value;
  for (const secret of KNOWN_SECRETS) {
    output = output.split(secret).join(PLACEHOLDER);
  }
  for (const [pattern, replacement] of PATTERNS) {
    output = output.replace(pattern, replacement);
  }
  return output;
};

/** Deep-clones a value, replacing sensitive keys and string-embedded secrets. */
export const redact = (value: unknown): unknown => {
  if (typeof value === "string") {
    return scrubString(value);
  }
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, val]) => [
        key,
        SENSITIVE_KEY.test(key) ? PLACEHOLDER : redact(val),
      ]),
    );
  }
  return value;
};

/**
 * Winston's JSON formatter serialises with `JSON.stringify`, which drops
 * `Error.message`/`Error.stack` (they are non-enumerable).
 */
export const serializeError = (error: unknown): Record<string, unknown> => {
  if (error instanceof AxiosError) {
    return {
      name: error.name,
      message: scrubString(error.message),
      status: error.response?.status,
      method: error.config?.method?.toUpperCase(),
      url: error.config?.url ? scrubString(error.config.url) : undefined,
      response: redact(error.response?.data),
      stack: error.stack ? scrubString(error.stack) : undefined,
    };
  }
  if (error instanceof Error) {
    const cause = (error as { cause?: unknown }).cause;
    return {
      name: error.name,
      message: scrubString(error.message),
      stack: error.stack ? scrubString(error.stack) : undefined,
      cause: cause instanceof Error ? scrubString(cause.message) : cause,
    };
  }
  return { error: redact(error) };
};
