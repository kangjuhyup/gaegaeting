import { Field, InputType, Int } from '@nestjs/graphql';
import { PetBreedGql, PetGenderGql, PetPersonalityGql, PetSizeGql } from './pet.enum';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

@InputType()
export class CreatePetInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @Field(() => Int)
  @IsInt()
  @Min(0)
  age: number;

  @Field(() => PetGenderGql)
  @IsEnum(PetGenderGql)
  gender: PetGenderGql;

  @Field(() => PetBreedGql)
  @IsEnum(PetBreedGql)
  breed: PetBreedGql;

  @Field(() => PetSizeGql)
  @IsEnum(PetSizeGql)
  size: PetSizeGql;

  @Field(() => [PetPersonalityGql])
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(PetPersonalityGql, { each: true })
  personalities: PetPersonalityGql[];

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

@InputType()
export class UpdatePetInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;

  @Field(() => [PetPersonalityGql], { nullable: true })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(PetPersonalityGql, { each: true })
  personalities?: PetPersonalityGql[];

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

@InputType()
export class CertifyPetInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  userName: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  certificationCode: string;
}


