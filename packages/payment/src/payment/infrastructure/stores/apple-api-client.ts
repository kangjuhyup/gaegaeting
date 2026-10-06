import {
  AppStoreServerAPIClient,
  Environment,
} from "@apple/app-store-server-library";
import fetch from "node-fetch";
import type { Response } from "node-fetch";
import { PaymentError } from "../../domain/payment.js";

/** Keeps Apple's SDK authentication and validation while bounding the actual HTTP socket and body. */
export class AppleApiClientWithTimeout extends AppStoreServerAPIClient {
  private readonly endpoint: string;

  constructor(
    signingKey: string,
    keyId: string,
    issuerId: string,
    bundleId: string,
    environment: Environment,
    private readonly transport: typeof fetch = fetch,
  ) {
    super(signingKey, keyId, issuerId, bundleId, environment);
    if (![Environment.PRODUCTION, Environment.SANDBOX].includes(environment))
      throw new PaymentError("INVALID_STORE_CONFIGURATION");
    this.endpoint =
      environment === Environment.PRODUCTION
        ? "https://api.storekit.apple.com"
        : "https://api.storekit-sandbox.apple.com";
  }

  protected override async makeFetchRequest(
    path: string,
    parsedQueryParameters: URLSearchParams,
    method: string,
    requestBody: string | Buffer | undefined,
    headers: Record<string, string>,
  ): Promise<Response> {
    return this.transport(
      `${this.endpoint}${path}?${parsedQueryParameters.toString()}`,
      {
        method,
        body: requestBody,
        headers,
        signal: AbortSignal.timeout(10_000),
        // Apple API calls do not need redirects; keep credentials on the configured store host.
        redirect: "error",
      },
    );
  }
}
