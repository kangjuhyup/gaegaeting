export interface ProvisionAuthAccountInput {
  username: string;
  password: string;
  idempotencyKey: string;
}

export abstract class AuthAccountProvisioningPort {
  abstract provision(
    input: ProvisionAuthAccountInput,
  ): Promise<{ authSubject: string }>;
}
