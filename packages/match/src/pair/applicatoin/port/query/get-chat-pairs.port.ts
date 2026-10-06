import type { UserPrincipal } from '@core/auth';

export class GetChatPairsQuery {
  constructor(public readonly user: UserPrincipal) {}
}
