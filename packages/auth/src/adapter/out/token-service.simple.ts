import { Injectable } from '@nestjs/common';
import { AuthPayloadDto, IssueTokenCommand, TokenServicePort } from '../../application/port/token-service.port';

@Injectable()
export class SimpleTokenService extends TokenServicePort {
  async issueForUser(cmd: IssueTokenCommand): Promise<AuthPayloadDto> {
    const accessToken = `acc_${cmd.tenantId}_${cmd.userId}`;
    const refreshToken = `ref_${cmd.tenantId}_${cmd.userId}`;
    return { accessToken, refreshToken, expiresIn: 3600 };
    }
}


