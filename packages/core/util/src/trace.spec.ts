import { setTimeout as delay } from "node:timers/promises";
import { getTraceId, requestTraceMiddleware, resolveTraceId } from "./trace.js";

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("request trace ID", () => {
  test.each(["client-request-123", "a".repeat(128)])(
    "preserves a valid ID",
    (id) => {
      expect(resolveTraceId(id)).toBe(id);
    },
  );

  test.each([
    undefined,
    "",
    "has spaces",
    "a,b",
    "line\nbreak",
    "한글",
    "a".repeat(129),
    ["one", "two"],
  ])("replaces missing, invalid or ambiguous IDs with a UUID", (id) => {
    expect(resolveTraceId(id)).toMatch(uuid);
  });

  test("concurrent requests keep their own ID across asynchronous work", async () => {
    const observed = await Promise.all(
      ["first", "second"].map(
        (id, index) =>
          new Promise((resolve) => {
            const request: any = { headers: { "x-trace-id": id } };
            const response: any = {
              setHeader: (_key: string, value: string) =>
                expect(value).toBe(id),
            };
            requestTraceMiddleware(request, response, () => {
              void (async () => {
                await delay(index === 0 ? 10 : 1);
                resolve({
                  context: getTraceId(),
                  header: request.headers["x-trace-id"],
                  requestId: request.id,
                });
              })();
            });
          }),
      ),
    );
    expect(observed).toEqual([
      { context: "first", header: "first", requestId: "first" },
      { context: "second", header: "second", requestId: "second" },
    ]);
    expect(getTraceId()).toBeUndefined();
  });
});
