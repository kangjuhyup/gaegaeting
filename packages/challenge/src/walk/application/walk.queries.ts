import { Injectable, NotFoundException } from "@nestjs/common";
import { page } from "../../shared/application/content-validation.js";
import { WalkRepository } from "./walk.repository.js";
@Injectable()
export class WalkQueries {
  constructor(private readonly repository: WalkRepository) {}
  async own(userId: string, id: string) {
    const value = await this.repository.find(id);
    if (!value || value.userId !== userId || value.state === "DELETED")
      throw new NotFoundException("산책 기록이 없습니다.");
    return value;
  }
  current(userId: string) {
    return this.repository.current(userId);
  }
  list(userId: string, limit: number, offset: number) {
    page(limit, offset);
    return this.repository.list(userId, limit, offset);
  }
  passport(userId: string) {
    return this.repository.passport(userId);
  }
}
