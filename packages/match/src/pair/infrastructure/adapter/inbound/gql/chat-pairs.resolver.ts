import { UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Field, Int, ObjectType, Query, Resolver } from '@nestjs/graphql';
import { GraphqlAccessGuard, Scopes, UserParam, type UserPrincipal } from '@core/auth';
import { GetChatPairsQuery } from '#app/pair/applicatoin/port/query/get-chat-pairs.port';

@ObjectType('ChatPair')
export class ChatPairType {
  @Field(() => Int) pairId!: number;
  @Field() leftUserId!: string;
  @Field() rightUserId!: string;
}

@Resolver()
@UseGuards(GraphqlAccessGuard)
export class ChatPairsResolver {
  constructor(private readonly queries: QueryBus) {}

  @Query(() => [ChatPairType])
  @Scopes('match:read')
  async chatPairs(@UserParam() user: UserPrincipal) {
    const result = await this.queries.execute(new GetChatPairsQuery(user));
    return result.pairs;
  }
}
