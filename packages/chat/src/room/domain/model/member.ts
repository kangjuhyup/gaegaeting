import { PersistenceEntity } from "@core/model";

export enum MemberRole {
  OWNER = 1,
  MEMBER = 2
}

export interface IMember {
  roomId: number;
  userId: string;
  role: MemberRole;
  lastReadMessageId?: string;
  lastReadAt?: Date;
  mutedUntil?: Date;
  joinedAt: Date;
  leftAt?: Date;
}

export class MemberEntity extends PersistenceEntity<string, IMember> {

  constructor(param: IMember) {
    super(param);
  }

  get roomId(): number {
    return this.etc.roomId;
  }

  get userId(): string {
    return this.etc.userId;
  }

  get role(): MemberRole {
    return this.etc.role;
  }

  get lastReadMessageId(): string | undefined {
    return this.etc.lastReadMessageId;
  }

  get lastReadAt(): Date | undefined {
    return this.etc.lastReadAt;
  }

  get mutedUntil(): Date | undefined {
    return this.etc.mutedUntil;
  }

  get joinedAt(): Date {
    return this.etc.joinedAt;
  }

  get leftAt(): Date | undefined {
    return this.etc.leftAt;
  }

  static create(roomId: number, userId: string, role: MemberRole = MemberRole.MEMBER): MemberEntity {
    return new MemberEntity({
      roomId,
      userId,
      role,
      joinedAt: new Date()
    });
  }

  static createOwner(roomId: number, userId: string): MemberEntity {
    return MemberEntity.create(roomId, userId, MemberRole.OWNER);
  }

  leave(): MemberEntity {
    return new MemberEntity({
      ...this.etc,
      leftAt: new Date()
    });
  }

  updateReadPosition(messageId: string): MemberEntity {
    return new MemberEntity({
      ...this.etc,
      lastReadMessageId: messageId,
      lastReadAt: new Date()
    });
  }

  mute(until: Date): MemberEntity {
    return new MemberEntity({
      ...this.etc,
      mutedUntil: until
    });
  }

  unmute(): MemberEntity {
    return new MemberEntity({
      ...this.etc,
      mutedUntil: undefined
    });
  }

  isActive(): boolean {
    return !this.leftAt;
  }

  isOwner(): boolean {
    return this.role === MemberRole.OWNER;
  }

  isMuted(): boolean {
    return this.mutedUntil ? this.mutedUntil > new Date() : false;
  }
}