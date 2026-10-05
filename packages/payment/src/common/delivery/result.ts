import { GraphQLError } from "graphql";
import { PaymentError } from "../domain/payment-error.js";

export async function publicResult<T>(work: () => Promise<T>): Promise<any> {
  try {
    return await work();
  } catch (error) {
    const code =
      error instanceof PaymentError
        ? error.code
        : "PAYMENT_TEMPORARILY_UNAVAILABLE";
    throw new GraphQLError(code, { extensions: { code } });
  }
}
