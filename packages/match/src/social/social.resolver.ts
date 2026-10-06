import {
  Args,
  Field,
  Int,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from "@nestjs/graphql";
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UseGuards,
} from "@nestjs/common";
import { CommandBus } from "@nestjs/cqrs";
import {
  GraphqlAccessGuard,
  Scopes,
  UserParam,
  type UserPrincipal,
} from "@core/auth";
import { LikeRepositoryPort } from "../like/domain/port/like.repository.port.js";
import { PairRepositoryPort } from "../pair/domain/port/pair.repository.port.js";
import { AcceptLikeCommand } from "../like/application/port/command/accept-like.command.js";
import { CancelLikeCommand } from "../like/application/port/command/cancel-like.port.js";
import { CancelPairCommand } from "../pair/applicatoin/port/command/cancel-pair.port.js";
import { ReportPairCommand } from "../pair/applicatoin/port/command/report-pair.port.js";

@ObjectType("SocialLike")
export class SocialLike {
  @Field(() => Int) id!: number;
  @Field() otherUserId!: string;
  @Field() likedAt!: string;
}
@ObjectType("SocialPair")
export class SocialPair {
  @Field(() => Int) id!: number;
  @Field() otherUserId!: string;
  @Field() createdAt!: string;
}
@Resolver()
@UseGuards(GraphqlAccessGuard)
export class SocialResolver {
  constructor(
    private readonly likes: LikeRepositoryPort,
    private readonly pairs: PairRepositoryPort,
    private readonly commands: CommandBus,
  ) {}
  private page<T>(rows: T[], limit: number, offset: number): T[] {
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 50 ||
      !Number.isInteger(offset) ||
      offset < 0 ||
      offset > 10000
    )
      throw new BadRequestException("조회 범위를 확인해 주세요.");
    return rows.slice(offset, offset + limit);
  }
  private id(id: number): void {
    if (!Number.isSafeInteger(id) || id < 1)
      throw new BadRequestException("잘못된 ID입니다.");
  }
  @Query(() => [SocialLike])
  @Scopes("match:read")
  async myReceivedLikes(
    @UserParam() user: UserPrincipal,
    @Args("limit", { type: () => Int, defaultValue: 50 }) limit: number,
    @Args("offset", { type: () => Int, defaultValue: 0 }) offset: number,
  ) {
    const rows = await this.likes.selectLikeInFromUserId(user.userId);
    const outgoing = await this.likes.selectLikeOutFromUserId(user.userId);
    const accepted = new Set(
      outgoing
        .filter((l) => l.active && l.likerId === user.userId)
        .map((l) => l.likeeId),
    );
    return this.page(
      rows
        .filter(
          (l) =>
            l.active && l.likeeId === user.userId && !accepted.has(l.likerId),
        )
        .sort((a, b) => b.id - a.id)
        .map((l) => ({
          id: l.id,
          otherUserId: l.likerId,
          likedAt: l.createdAt.toISOString(),
        })),
      limit,
      offset,
    );
  }
  @Query(() => [SocialLike])
  @Scopes("match:read")
  async mySentLikes(
    @UserParam() user: UserPrincipal,
    @Args("limit", { type: () => Int, defaultValue: 50 }) limit: number,
    @Args("offset", { type: () => Int, defaultValue: 0 }) offset: number,
  ) {
    const rows = await this.likes.selectLikeOutFromUserId(user.userId);
    return this.page(
      rows
        .filter((l) => l.active && l.likerId === user.userId)
        .sort((a, b) => b.id - a.id)
        .map((l) => ({
          id: l.id,
          otherUserId: l.likeeId,
          likedAt: l.createdAt.toISOString(),
        })),
      limit,
      offset,
    );
  }
  @Query(() => [SocialPair])
  @Scopes("match:read")
  async myPairs(
    @UserParam() user: UserPrincipal,
    @Args("limit", { type: () => Int, defaultValue: 50 }) limit: number,
    @Args("offset", { type: () => Int, defaultValue: 0 }) offset: number,
  ) {
    const rows = await this.pairs.selectPairsFromUser(user.userId);
    return this.page(
      rows
        .filter(
          (p) =>
            p.active && [p.leftUserId, p.rightUserId].includes(user.userId),
        )
        .sort((a, b) => b.id - a.id)
        .map((p) => ({
          id: p.id,
          otherUserId:
            p.leftUserId === user.userId ? p.rightUserId : p.leftUserId,
          createdAt: p.createdAt.toISOString(),
        })),
      limit,
      offset,
    );
  }
  @Mutation(() => Boolean)
  @Scopes("match:write")
  async acceptLike(
    @UserParam() user: UserPrincipal,
    @Args("id", { type: () => Int }) id: number,
  ) {
    this.id(id);
    await this.commands.execute(new AcceptLikeCommand(user, id));
    return true;
  }
  @Mutation(() => Boolean)
  @Scopes("match:write")
  async declineLike(
    @UserParam() user: UserPrincipal,
    @Args("id", { type: () => Int }) id: number,
  ) {
    this.id(id);
    const like = await this.likes.selectLikeFromId(id);
    if (!like) throw new NotFoundException("관심을 찾을 수 없습니다.");
    if (like.likeeId !== user.userId)
      throw new ForbiddenException("내가 받은 관심만 거절할 수 있습니다.");
    if (like.active)
      await this.commands.execute(new CancelLikeCommand(user, id));
    return true;
  }
  @Mutation(() => Boolean)
  @Scopes("match:write")
  async cancelPair(
    @UserParam() user: UserPrincipal,
    @Args("id", { type: () => Int }) id: number,
  ) {
    this.id(id);
    await this.commands.execute(new CancelPairCommand(user, id));
    return true;
  }
  @Mutation(() => Boolean)
  @Scopes("match:write")
  async reportPair(
    @UserParam() user: UserPrincipal,
    @Args("id", { type: () => Int }) id: number,
    @Args("reason") reason: string,
  ) {
    this.id(id);
    const text = reason.trim();
    if (!text || text.length > 1000)
      throw new BadRequestException("신고 사유는 1~1000자입니다.");
    await this.commands.execute(new ReportPairCommand(user, id, text));
    return true;
  }
}
