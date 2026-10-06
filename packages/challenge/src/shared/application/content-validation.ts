import { BadRequestException, ConflictException } from "@nestjs/common";
import type { ChallengeRepository } from "./challenge.repository.js";
export function page(limit: number, offset: number): void {
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 50 ||
    !Number.isInteger(offset) ||
    offset < 0 ||
    offset > 10_000
  )
    throw new BadRequestException(
      "조회 개수는 1~50, 시작 위치는 0~10000이어야 합니다.",
    );
}
export function textField(
  value: string,
  max: number,
  required = false,
): string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    (required && !value.trim())
  )
    throw new BadRequestException("입력 길이 또는 필수 항목을 확인해 주세요.");
  return value.trim();
}
export function requestId(value: string): void {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    throw new BadRequestException("UUID 요청 식별자가 필요합니다.");
}
export async function activeUser(
  repository: ChallengeRepository,
  userId: string,
): Promise<void> {
  if (await repository.isUserDeleted(userId))
    throw new ConflictException("탈퇴한 계정으로 기록을 만들 수 없습니다.");
}
