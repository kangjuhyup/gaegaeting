import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { RegistrationService } from '../../../../../application/service/registration.service.js';
import {
  ClaimRegistrationEligibilityRequest,
  CompleteRegistrationEligibilityRequest,
} from './registration.dto.js';
import { RegistrationServiceGuard } from './registration-service.guard.js';

@Controller('internal/v1/registration-eligibilities')
@UseGuards(RegistrationServiceGuard)
export class InternalRegistrationEligibilityController {
  constructor(private readonly registrations: RegistrationService) {}

  @Post('claim')
  @HttpCode(HttpStatus.OK)
  claim(@Body() body: ClaimRegistrationEligibilityRequest) {
    return this.registrations.claim(body).then(result => ({
      registrationId: result.registrationId,
      attemptId: result.attemptId,
      status: 'CLAIMED' as const,
      claimExpiresAt: result.claimedUntil,
    }));
  }

  @Post('complete')
  @HttpCode(HttpStatus.OK)
  complete(@Body() body: CompleteRegistrationEligibilityRequest) {
    return this.registrations.complete(body);
  }
}
