import { jest } from "@jest/globals";
import { getTraceId, requestTraceMiddleware } from "@core/util/trace";
import { FetchHttpClient } from "./fetch.client.js";

function inRequest<T>(id: string, work: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    requestTraceMiddleware(
      { headers: { "x-trace-id": id } } as any,
      { setHeader() {} } as any,
      () => {
        work().then(resolve, reject);
      },
    );
  });
}

function ok() {
  return new Response("{}", { status: 200 });
}

describe("HTTP request trace propagation", () => {
  afterEach(() => jest.restoreAllMocks());

  test("a shared client propagates the active ID without mixing concurrent requests", async () => {
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockImplementation(async (_url, options) => {
        await Promise.resolve();
        expect(new Headers(options?.headers).get("x-trace-id")).toBe(
          getTraceId() ?? null,
        );
        return ok();
      });
    const client = new FetchHttpClient();
    client.setDefaultRetryCount(0);
    await Promise.all(
      ["first", "second"].map((id) =>
        inRequest(id, () => client.get("http://account/users")),
      ),
    );
    await client.get("http://account/users");
    expect(
      fetchMock.mock.calls.map(([, options]) =>
        new Headers(options?.headers).get("x-trace-id"),
      ),
    ).toEqual(["first", "second", null]);
  });

  test("retries keep the inbound ID, including when caller headers use a different case", async () => {
    const fetchMock = jest
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("connection reset"))
      .mockImplementation(async () => ok());
    const client = new FetchHttpClient();
    await inRequest("original-request", () =>
      client.get("http://account/users", {
        retryCount: 1,
        headers: { "X-Trace-Id": "overridden-id" },
      }),
    );
    expect(
      fetchMock.mock.calls.map(([, options]) =>
        new Headers(options?.headers).get("x-trace-id"),
      ),
    ).toEqual(["original-request", "original-request"]);
  });
});
