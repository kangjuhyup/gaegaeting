import { Field, InputType } from "@nestjs/graphql";
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
} from "class-validator";

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
}
