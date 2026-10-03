import { UnprocessableEntityException } from "@nestjs/common";
import type { IdentityVerificationRequest } from "../port/identity-verification.port.js";

export function normalizeIdentityVerificationRequest(
  input: IdentityVerificationRequest,
): IdentityVerificationRequest {
  const name =
    typeof input?.name === "string" ? input.name.trim().normalize("NFC") : "";
  const phone =
    typeof input?.phone === "string" ? input.phone.replace(/[\s()-]/g, "") : "";
  const birthDate = new Date(`${input?.birthDate}T00:00:00.000Z`);
  if (
    !name ||
    name.length > 50 ||
    !/^\+?\d{8,15}$/.test(phone) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(input?.birthDate ?? "") ||
    Number.isNaN(birthDate.getTime()) ||
    birthDate.toISOString().slice(0, 10) !== input.birthDate ||
    (input.gender !== "MALE" && input.gender !== "FEMALE")
  ) {
    throw new UnprocessableEntityException(
      "Complete signup identity is required",
    );
  }
  return { name, phone, birthDate: input.birthDate, gender: input.gender };
}

export function isAdultIdentity(birthDate: string, today: Date): boolean {
  const birth = new Date(`${birthDate}T00:00:00.000Z`);
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  if (
    today.getUTCMonth() < birth.getUTCMonth() ||
    (today.getUTCMonth() === birth.getUTCMonth() &&
      today.getUTCDate() < birth.getUTCDate())
  )
    age--;
  return age >= 18;
}
