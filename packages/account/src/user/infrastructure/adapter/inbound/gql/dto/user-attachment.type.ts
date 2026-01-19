import { Field, GraphQLISODateTime, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class UserAttachment {
  @Field(() => ID)
  userId: string;

  @Field(() => Int)
  no: number;

  @Field(() => String)
  path: string;

  @Field(() => Boolean)
  active: boolean;

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;
}

