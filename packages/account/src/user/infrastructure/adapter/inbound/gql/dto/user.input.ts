import { Field, InputType, GraphQLISODateTime } from '@nestjs/graphql';
import { UserGenderGql, UserRegionGql } from './user.enum.js';
import { IsDate, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class CreateUserProfileInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name?: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  nickname: string;

  @Field(() => UserGenderGql, { nullable: true })
  @IsOptional()
  @IsEnum(UserGenderGql)
  gender?: UserGenderGql;

  @Field(() => GraphQLISODateTime, { nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  birthDate?: Date;

  @Field(() => UserRegionGql)
  @IsEnum(UserRegionGql)
  region: UserRegionGql;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}

@InputType()
export class UpdateUserProfileInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nickname?: string;

  @Field(() => UserRegionGql, { nullable: true })
  @IsOptional()
  @IsEnum(UserRegionGql)
  region?: UserRegionGql;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}

