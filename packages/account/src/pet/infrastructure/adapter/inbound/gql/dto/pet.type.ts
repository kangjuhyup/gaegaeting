import { Directive, Field, GraphQLISODateTime, ID, Int, ObjectType } from '@nestjs/graphql';
import { PetBreedGql, PetGenderGql, PetPersonalityGql, PetSizeGql } from './pet.enum';
import { UserProfile } from '@app/user/infrastructure/adapter/inbound/gql/dto/user.type';
import { PetAttachment } from './pet-attachment.type';

@ObjectType()
@Directive('@key(fields: "id")')
export class Pet {
  @Field(() => Int)
  id: number;

  @Field(() => String)
  name: string;

  @Field(() => Int)
  age: number;

  @Field(() => PetGenderGql)
  gender: PetGenderGql;

  @Field(() => PetBreedGql)
  breed: PetBreedGql;

  @Field(() => PetSizeGql)
  size: PetSizeGql;

  @Field(() => [PetPersonalityGql])
  personalities: PetPersonalityGql[];

  @Field(() => String, { nullable: true })
  description?: string;

  @Field(() => ID)
  userId: string;

  @Field(() => UserProfile, { nullable: true })
  user?: UserProfile;

  @Field(() => Boolean)
  isCertificated: boolean;

  @Field(() => [String])
  profileImages: string[];

  @Field(() => [PetAttachment], { nullable: 'itemsAndList' })
  attachments?: PetAttachment[];

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;
}


