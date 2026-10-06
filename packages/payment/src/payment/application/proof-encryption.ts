export abstract class ProofEncryption {
  abstract encrypt(proof: string): string;
  abstract decrypt(envelope: string): string;
}
