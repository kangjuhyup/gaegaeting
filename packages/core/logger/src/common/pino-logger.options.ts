import { resolveTraceId, TRACE_ID_HEADER } from "@core/util/trace";

/**
 * Pino 로거 옵션 생성 함수
 *
 * @param options 로거 옵션
 * @returns Pino 로거 모듈 옵션
 */
export const createPinoLoggerOptions = (options?: {
  name?: string;
  level?: string;
  pretty?: boolean;
}): any => {
  const name = options?.name || "App";
  const level = options?.level || "info";
  const pretty = options?.pretty ?? process.env.NODE_ENV !== "production";

  const pinoHttp: any = {
    name,
    level,
    genReqId: (req, res) => {
      const traceId = resolveTraceId(req.headers[TRACE_ID_HEADER]);
      req.headers[TRACE_ID_HEADER] = traceId;
      res.setHeader(TRACE_ID_HEADER, traceId);
      return traceId;
    },
    customProps: (req) => ({ traceId: req.id }),
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.headers[\"x-gaegaeting-edge-assertion\"]",
        "req.body.body",
        "req.body.variables.input.body",
        "req.body.ci",
        "req.body.di",
        "req.body.handoffId",
        "req.body.ticket",
        "req.body.attemptId",
        "req.body.providerSub",
        "req.body.variables.input.ci",
        "req.body.variables.input.di",
        "req.body.variables.input.handoffId",
        "req.body.variables.input.ticket",
        "req.body.variables.input.attemptId",
        "req.body.query",
        "req.headers[\"x-gaegaeting-principal\"]",
        "req.body.variables.input.providerSub",
        "req.body.name",
        "req.body.variables.input.name",
        "req.body.birthDate",
        "req.body.variables.input.birthDate",
        "req.body.phone",
        "req.body.variables.input.phone",
        "req.body.username",
        "req.body.variables.input.username",
        "req.body.password",
        "req.body.variables.input.password",
        "req.body.email",
        "req.body.variables.input.email",
        "req.body.userName",
        "req.body.variables.input.userName",
        "req.body.certificationCode",
        "req.body.variables.input.certificationCode",
      ],
      censor: "[REDACTED]",
    },
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
  };

  // pretty 모드일 때만 transport 설정
  if (pretty) {
    try {
      pinoHttp.transport = {
        target: "pino-pretty",
        options: {
          colorize: true,
          levelFirst: true,
          translateTime: "yyyy-mm-dd HH:MM:ss",
        },
      };
    } catch (error) {
      // pino-pretty가 설치되지 않은 경우 일반 JSON 로그로 fallback
      console.warn("pino-pretty not available, falling back to JSON logging");
    }
  }

  return {
    pinoHttp,
    exclude: ["/health", "/metrics"],
  };
};
