import { Field, InputType } from "@nestjs/graphql";
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";
import { UserGenderGql } from "./user.enum.js";
import { SOCIAL_SIGNUP_CLIENT_IDS } from '../../../../../application/port/auth-external-signup.port.js';

@InputType()
export class RegisterSocialAccountInput {
  @Field({ nullable: true }) @IsOptional() @IsIn(SOCIAL_SIGNUP_CLIENT_IDS) clientId?: string;
  @Field() @Matches(/^[A-Za-z0-9_-]{32,256}$/) ticket!: string;
  @Field() @Matches(/^[A-Za-z0-9_-]{16,128}$/) attemptId!: string;
  @Field() @IsString() @IsNotEmpty() @MaxLength(64) termsVersion!: string;
  @Field() @IsBoolean() termsAgreed!: boolean;
  @Field() @IsString() @IsNotEmpty() @MaxLength(50) name!: string;
  @Field() @Matches(/^\d{4}-\d{2}-\d{2}$/) birthDate!: string;
  @Field(() => UserGenderGql) @IsEnum(UserGenderGql) gender!: UserGenderGql;
  @Field() @IsString() @IsNotEmpty() @MaxLength(32) phone!: string;
}
