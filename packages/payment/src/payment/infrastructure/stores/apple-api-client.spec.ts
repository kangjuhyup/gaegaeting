import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { describe, expect, it, jest } from "@jest/globals";
import { Environment } from "@apple/app-store-server-library";
import fetch, { Response } from "node-fetch";
import { AppleApiClientWithTimeout } from "./apple-api-client.js";

class TestClient extends AppleApiClientWithTimeout {
  send() {
    return this.makeFetchRequest(
      "/inApps/v1/transactions/123",
      new URLSearchParams({ revision: "page" }),
      "GET",
      undefined,
      { Authorization: "Bearer private-token" },
    );
  }
}

describe("Bounded Apple server API transport", () => {
  it.each([
    [Environment.PRODUCTION, "https://api.storekit.apple.com"],
    [Environment.SANDBOX, "https://api.storekit-sandbox.apple.com"],
  ])(
    "keeps %s requests on the configured Apple host with a ten second deadline",
    async (environment, endpoint) => {
      const transport = jest
        .fn<typeof fetch>()
        .mockResolvedValue(new Response("{}"));
      const timeout = jest.spyOn(AbortSignal, "timeout");
      try {
        const client = new TestClient(
          "key",
          "key-id",
          "issuer",
          "com.app",
          environment,
          transport,
        );
        await client.send();
        expect(timeout).toHaveBeenCalledWith(10_000);
        expect(transport).toHaveBeenCalledWith(
          `${endpoint}/inApps/v1/transactions/123?revision=page`,
          expect.objectContaining({
            method: "GET",
            headers: { Authorization: "Bearer private-token" },
            redirect: "error",
            signal: expect.any(AbortSignal),
          }),
        );
      } finally {
        timeout.mockRestore();
      }
    },
  );

  it.each(["headers", "body"])(
    "aborts a real stalled HTTP %s stream and releases its connection",
    async (stage) => {
      const server = createServer((_request, response) => {
        if (stage === "body") {
          response.writeHead(200, { "Content-Type": "application/json" });
          response.write("{");
        }
      });
      await new Promise<void>((resolve) =>
        server.listen(0, "127.0.0.1", resolve),
      );
      const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
      const realTimeout = AbortSignal.timeout.bind(AbortSignal);
      const deadline = jest
        .spyOn(AbortSignal, "timeout")
        .mockImplementation(() => realTimeout(40));
      try {
        const transport: typeof fetch = (_url, init) => fetch(url, init);
        const client = new TestClient(
          "key",
          "key-id",
          "issuer",
          "com.app",
          Environment.SANDBOX,
          transport,
        );
        const pending = client.send().then((response) => response.json());
        await expect(pending).rejects.toMatchObject({ name: "AbortError" });
        expect(deadline).toHaveBeenCalledWith(10_000);
      } finally {
        deadline.mockRestore();
        server.closeAllConnections();
        await new Promise<void>((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
      }
    },
  );
});
