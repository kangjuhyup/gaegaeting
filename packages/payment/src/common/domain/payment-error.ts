export class PaymentError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}
