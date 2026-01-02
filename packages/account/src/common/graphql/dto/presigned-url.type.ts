import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class PresignedUrl {
  @Field(() => String)
  url: string;

  @Field(() => Int)
  expiresIn: number;
}


