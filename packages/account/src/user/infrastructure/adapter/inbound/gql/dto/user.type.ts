import { Directive, Field, ID, ObjectType, GraphQLISODateTime } from '@nestjs/graphql';
import { UserGenderGql, UserRegionGql, UserStatusGql } from './user.enum';

@ObjectType()
@Directive('@key(fields: "id")')
export class UserProfile {
  @Field(() => ID)
  id: string;

  @Field(() => String)
  name: string;

  @Field(() => String)
  nickname: string;

  @Field(() => String, { nullable: true })
  email?: string;

  @Field(() => UserGenderGql)
  gender: UserGenderGql;

  @Field(() => GraphQLISODateTime)
  birthDate: Date;

  @Field(() => UserRegionGql)
  region: UserRegionGql;

  @Field(() => String, { nullable: true })
  bio?: string;

  @Field(() => String, { nullable: true })
  phoneNumber?: string;

  @Field(() => UserStatusGql)
  status: UserStatusGql;

  @Field(() => [String])
  profileImages: string[];

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;
}


