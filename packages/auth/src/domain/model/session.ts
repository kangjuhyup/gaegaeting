export class Session {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly tenantId: string,
    public readonly deviceInfo: string | null,
    public readonly ipAddress: string | null,
    public readonly userAgent: string | null,
    public lastActivityAt: Date,
    public readonly createdAt: Date,
    public readonly expiresAt: Date,
  ) {}

  static create(params: {
    id: string;
    userId: string;
    tenantId: string;
    deviceInfo?: string;
    ipAddress?: string;
    userAgent?: string;
    ttlSeconds: number;
  }): Session {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + params.ttlSeconds * 1000);
    return new Session(
      params.id,
      params.userId,
      params.tenantId,
      params.deviceInfo ?? null,
      params.ipAddress ?? null,
      params.userAgent ?? null,
      now,
      now,
      expiresAt,
    );
  }

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isActive(): boolean {
    return !this.isExpired();
  }

  updateActivity(): void {
    if (this.isExpired()) {
      throw new Error('Cannot update activity on expired session');
    }
    this.lastActivityAt = new Date();
  }

  getRemainingTime(): number {
    const now = new Date();
    return Math.max(0, this.expiresAt.getTime() - now.getTime());
  }
}

