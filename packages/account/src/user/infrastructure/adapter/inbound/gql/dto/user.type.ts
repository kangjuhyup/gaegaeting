import { Directive, Field, ID, ObjectType, GraphQLISODateTime } from '@nestjs/graphql';
import { Pet } from '@app/pet/infrastructure/adapter/inbound/gql/dto/pet.type';
import { UserGenderGql, UserRegionGql, UserStatusGql } from './user.enum';
import { UserAttachment } from './user-attachment.type';

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

  @Field(() => [UserAttachment], { nullable: 'itemsAndList' })
  attachments?: UserAttachment[];

  @Field(() => [Pet], { nullable: 'itemsAndList' })
  pets?: Pet[];

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;
}


