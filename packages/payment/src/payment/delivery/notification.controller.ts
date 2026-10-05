import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { PaymentService } from "../application/payment.service.js";
import type { Provider } from "../domain/payment.js";

@Controller("notifications")
export class NotificationController {
  constructor(private readonly payment: PaymentService) {}
  @Post("apple")
  @HttpCode(200)
  apple(@Body() body: unknown) {
    return this.receive("APPLE", body);
  }
  @Post("google")
  @HttpCode(200)
  google(
    @Body() body: unknown,
    @Headers("authorization") authorization?: string,
  ) {
    return this.receive("GOOGLE", body, authorization);
  }
  private async receive(
    provider: Provider,
    body: unknown,
    authorization?: string,
  ) {
    try {
      await this.payment.notification(provider, body, authorization);
    } catch (error) {
      // Invalid provider proof must never be acknowledged as durable receipt.
      if (
        error instanceof Error &&
        [
          "INVALID_NOTIFICATION",
          "INVALID_PROOF",
          "INVALID_STORE_NOTIFICATION",
          "INVALID_STORE_PROOF",
          "PURCHASE_MISMATCH",
        ].includes(error.message)
      )
        throw new UnauthorizedException("INVALID_NOTIFICATION");
      throw new ServiceUnavailableException("NOTIFICATION_NOT_ACCEPTED");
    }
    return { accepted: true };
  }
}
