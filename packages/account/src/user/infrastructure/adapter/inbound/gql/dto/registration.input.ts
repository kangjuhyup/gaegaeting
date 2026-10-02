import { Field, InputType } from "@nestjs/graphql";
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsEnum,
  IsOptional,
  Matches,
  MaxLength,
} from "class-validator";
import { UserGenderGql } from './user.enum.js';

@InputType()
export class CompleteMockIdentityVerificationInput {
  @Field() @IsString() @IsNotEmpty() providerTransactionId!: string;
  @Field() @IsString() @IsNotEmpty() ci!: string;
  @Field() @IsString() @IsNotEmpty() di!: string;
  @Field() @IsBoolean() adult!: boolean;
  @Field() @IsString() @IsNotEmpty() tenantId!: string;
  @Field() @IsString() @IsNotEmpty() clientId!: string;
  @Field() @IsString() @IsNotEmpty() termsVersion!: string;
  @Field() @IsBoolean() termsAgreed!: boolean;
}

@InputType()
export class RegisterAccountInput extends CompleteMockIdentityVerificationInput {
  @Field() @IsString() @IsNotEmpty() username!: string;
  @Field() @IsString() @MinLength(8) password!: string;
  @Field() @IsEmail() email!: string;
  @Field() @IsString() @IsNotEmpty() phone!: string;
  @Field({ nullable: true }) @IsOptional() @IsString() @IsNotEmpty() @MaxLength(50) name?: string;
  @Field({ nullable: true }) @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) birthDate?: string;
  @Field(() => UserGenderGql, { nullable: true }) @IsOptional() @IsEnum(UserGenderGql) gender?: UserGenderGql;
}
