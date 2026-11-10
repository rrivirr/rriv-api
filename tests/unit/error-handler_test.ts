import { assert, assertEquals } from "@std/assert";
import { Writable } from "node:stream";
import winston from "npm:winston";
import { AxiosError, AxiosHeaders } from "npm:axios";
import logger from "../../src/winston.ts";
import errorHandler from "../../src/utils/error-handler.ts";

const TOKEN =
  "eyJhbGciOiJSUzI1NiJ9.eyJhenAiOiJkYXRhLWFwaSJ9.c2lnbmF0dXJlLXZhbHVl";

Deno.test("errorHandler never logs a service token, even at debug level", () => {
  let output = "";
  const transport = new winston.transports.Stream({
    stream: new Writable({
      write(chunk, _encoding, done) {
        output += chunk.toString();
        done();
      },
    }),
  });
  const previousLevel = logger.level;
  logger.level = "debug";
  logger.add(transport);

  try {
    const headers = new AxiosHeaders({ Authorization: `Bearer ${TOKEN}` });
    const config = {
      baseURL: "http://data-api:80",
      url: "/readings",
      method: "post",
      headers,
    };
    const error = new AxiosError(
      "Request failed with status code 500",
      "ERR_BAD_RESPONSE",
      config,
      {
        _header:
          `POST /readings HTTP/1.1\r\nAuthorization: Bearer ${TOKEN}\r\n`,
      },
      {
        status: 500,
        statusText: "Internal Server Error",
        data: { code: 500, message: "Internal Server Error" },
        headers: {},
        config,
      },
    );

    let status = 0;
    const res = {
      status(code: number) {
        status = code;
        return this;
      },
      send() {
        return this;
      },
    };
    errorHandler(error, {} as never, res as never, () => {});

    assertEquals(status, 500);
    assert(output.includes("Request failed with status code 500"), output);
    assert(!output.includes(TOKEN), "token leaked into the log");
    assert(!output.includes("c2lnbmF0dXJlLXZhbHVl"), "signature leaked");
  } finally {
    logger.remove(transport);
    logger.level = previousLevel;
  }
});
