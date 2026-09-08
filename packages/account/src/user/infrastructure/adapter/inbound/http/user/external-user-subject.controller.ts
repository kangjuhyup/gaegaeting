import { Body, Controller, Post } from '@nestjs/common';
import { ResolveExternalUserSubjectService } from '#app/user/application/service/resolve-external-user-subject.service';

@Controller('internal/subjects')
export class ExternalUserSubjectController {
  constructor(private readonly subjects: ResolveExternalUserSubjectService) {}

  @Post('resolve')
  async resolve(@Body() body: { tenant_id: string; sub: string }): Promise<{ user_id: string }> {
    return { user_id: await this.subjects.resolve(body.tenant_id, body.sub) };
  }
}
