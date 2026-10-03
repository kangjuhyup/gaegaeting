import { Controller, Get, Inject } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { PinoLogger } from "nestjs-pino";
import { getTraceId } from "@core/util/trace";
import { HttpLoggerModule } from "./http-logger.module.js";

@Controller("trace")
class TraceController {
  constructor(@Inject(PinoLogger) private readonly logger: PinoLogger) {}

  @Get()
  async trace() {
    await new Promise((resolve) => setImmediate(resolve));
    return { traceId: getTraceId(), bindings: this.logger.logger.bindings() };
  }
}

// Exercise real Nest middleware ordering and the request-scoped application logger.
test("Nest requests and application logs share the inbound trace ID with no concurrency leakage", async () => {
  const module = await Test.createTestingModule({
    imports: [HttpLoggerModule.forRoot({ pretty: false, level: "silent" })],
    controllers: [TraceController],
  }).compile();
  const app = module.createNestApplication();
  try {
    await app.listen(0, "127.0.0.1");
    const url = await app.getUrl();
    const results = await Promise.all(
      ["first", "second", undefined].map(async (id) => {
        const response = await fetch(`${url}/trace`, {
          headers: id ? { "x-trace-id": id } : {},
        });
        const traceId = response.headers.get("x-trace-id");
        const body = await response.json();
        expect(traceId).toBeTruthy();
        if (id) expect(traceId).toBe(id);
        expect(body.traceId).toBe(traceId);
        expect(body.bindings.traceId).toBe(traceId);
        expect(body.bindings.req.id).toBe(traceId);
        return traceId;
      }),
    );
    expect(new Set(results).size).toBe(3);
    expect(getTraceId()).toBeUndefined();
  } finally {
    await app.close();
  }
});
