import { IsNotEmpty, IsString } from 'class-validator';

export class ClaimRegistrationEligibilityRequest {
  @IsString() @IsNotEmpty() handoffId!: string;
  @IsString() @IsNotEmpty() tenantId!: string;
  @IsString() @IsNotEmpty() clientId!: string;
  @IsString() @IsNotEmpty() attemptId!: string;
}

export class CompleteRegistrationEligibilityRequest {
  @IsString() @IsNotEmpty() registrationId!: string;
  @IsString() @IsNotEmpty() attemptId!: string;
  @IsString() @IsNotEmpty() issuer!: string;
  @IsString() @IsNotEmpty() subject!: string;
}
