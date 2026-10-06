import { createPinoLoggerOptions } from "./pino-logger.options.js";
import { pino } from "pino";

describe("createPinoLoggerOptions", () => {
  test("redacts credentials and transient identity-verification values", () => {
    const options = createPinoLoggerOptions({ pretty: false });
    let output = "";
    const logger = pino(
      { ...options.pinoHttp, serializers: { req: (request) => request } },
      {
        write: (chunk) => {
          output += chunk;
        },
      },
    );
    const sensitive = {
      ci: "sensitive-ci",
      di: "sensitive-di",
      handoffId: "sensitive-handoff",
      ticket: "sensitive-ticket",
      attemptId: "sensitive-attempt",
    };
    logger.info(
      {
        traceId: "safe-trace",
        req: {
          headers: {
            authorization: "sensitive-bearer",
            cookie: "sensitive-cookie",
          },
          body: {
            ...sensitive,
            providerSub: "sensitive-provider-sub",
            query:
              "mutation { registerSocialAccount(input: { ticket: sensitive-inline-ticket }) { authSubject } }",
            variables: { input: { ...sensitive, termsVersion: "2026-09-01" } },
          },
        },
      },
      "signup request",
    );
    expect(output).not.toContain("sensitive-");
    const record = JSON.parse(output);
    expect(record.traceId).toBe("safe-trace");
    expect(record.req.body.variables.input.termsVersion).toBe("2026-09-01");
    expect(record.msg).toBe("signup request");
  });
});
