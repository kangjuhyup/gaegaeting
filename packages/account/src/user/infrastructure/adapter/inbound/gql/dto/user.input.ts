import { Field, InputType, GraphQLISODateTime } from '@nestjs/graphql';
import { UserGenderGql, UserRegionGql } from './user.enum';
import { IsDate, IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

@InputType()
export class CreateUserProfileInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  nickname: string;

  @Field(() => UserGenderGql)
  @IsEnum(UserGenderGql)
  gender: UserGenderGql;

  @Field(() => GraphQLISODateTime)
  @Type(() => Date)
  @IsDate()
  birthDate: Date;

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


