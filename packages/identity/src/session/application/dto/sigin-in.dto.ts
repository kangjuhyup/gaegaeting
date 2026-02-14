export class SigninInput {
  private constructor(
    public readonly provider: string,
    public readonly accessToken: string,
    public readonly refreshToken?: string,
    public readonly expiresIn?: number,
    public readonly tokenType?: string,
  ) {}

  static of(input: {
    provider: string;
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    tokenType?: string;
  }): SigninInput {
    return new SigninInput(
      input.provider,
      input.accessToken,
      input.refreshToken,
      input.expiresIn,
      input.tokenType,
    );
  }
}

export class SigninOutput {
  private constructor(
    public readonly userId: string,
    public readonly accessToken: string,
    public readonly refreshToken: string,
  ) {}

  static of(input: {
    userId: string;
    accessToken: string;
    refreshToken: string;
  }): SigninOutput {
    return new SigninOutput(
      input.userId,
      input.accessToken,
      input.refreshToken,
    );
  }
}
