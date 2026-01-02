import { Directive, Field, GraphQLISODateTime, ID, Int, ObjectType } from '@nestjs/graphql';
import { PetBreedGql, PetGenderGql, PetPersonalityGql, PetSizeGql } from './pet.enum';

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

  @Field(() => Boolean)
  isCertificated: boolean;

  @Field(() => [String])
  profileImages: string[];

  @Field(() => GraphQLISODateTime)
  createdAt: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt: Date;
}


