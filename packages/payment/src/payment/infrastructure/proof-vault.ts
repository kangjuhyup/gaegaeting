import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { PaymentError } from "../domain/payment.js";
import { ProofEncryption } from "../application/proof-encryption.js";

export class ProofVault extends ProofEncryption {
  private readonly key: Buffer;
  constructor(keyHex: string) {
    super();
    if (!/^[a-fA-F0-9]{64}$/.test(keyHex ?? ""))
      throw new Error("PAYMENT_PROOF_ENCRYPTION_KEY must be 64 hex characters");
    this.key = Buffer.from(keyHex, "hex");
  }
  encrypt(proof: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    cipher.setAAD(Buffer.from("gaegaeting-payment-proof-v1"));
    const encrypted = Buffer.concat([
      cipher.update(proof, "utf8"),
      cipher.final(),
    ]);
    return [
      "v1",
      iv.toString("base64url"),
      cipher.getAuthTag().toString("base64url"),
      encrypted.toString("base64url"),
    ].join(".");
  }
  decrypt(envelope: string): string {
    try {
      const [version, iv, tag, data, extra] = envelope.split(".");
      if (version !== "v1" || extra !== undefined || !iv || !tag || !data)
        throw new Error();
      const decipher = createDecipheriv(
        "aes-256-gcm",
        this.key,
        Buffer.from(iv, "base64url"),
      );
      decipher.setAAD(Buffer.from("gaegaeting-payment-proof-v1"));
      decipher.setAuthTag(Buffer.from(tag, "base64url"));
      return Buffer.concat([
        decipher.update(Buffer.from(data, "base64url")),
        decipher.final(),
      ]).toString("utf8");
    } catch {
      throw new PaymentError("PROOF_UNAVAILABLE");
    }
  }
}
