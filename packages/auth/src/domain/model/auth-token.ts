export class AuthToken {
  constructor(
    public readonly accessToken: string,
    public readonly refreshToken: string,
    public readonly expiresIn: number,
    public readonly tokenType: string = 'Bearer',
  ) {}

  static create(params: { accessToken: string; refreshToken: string; expiresIn: number }): AuthToken {
    if (!params.accessToken || params.accessToken.length === 0) {
      throw new Error('Access token is required');
    }
    if (!params.refreshToken || params.refreshToken.length === 0) {
      throw new Error('Refresh token is required');
    }
    if (params.expiresIn <= 0) {
      throw new Error('Expires in must be positive');
    }
    return new AuthToken(params.accessToken, params.refreshToken, params.expiresIn, 'Bearer');
  }

  getExpiresAt(): Date {
    return new Date(Date.now() + this.expiresIn * 1000);
  }

  toJSON() {
    return {
      access_token: this.accessToken,
      refresh_token: this.refreshToken,
      expires_in: this.expiresIn,
      token_type: this.tokenType,
    };
  }
}

