import { PersistenceEntity } from '@core/model';
import { MemberEntity } from './member';

export enum RoomType {
  DIRECT = 1,
  GROUP = 2
}

export interface IRoom {
  type: RoomType;
  directKey?: string;
  title?: string;
  lastMessageAt?: Date;
  pairId?: number;
}

export class RoomEntity extends PersistenceEntity<number, IRoom> {
  public readonly members: MemberEntity[];

  constructor(param: IRoom, members: MemberEntity[] = []) {
    super(param);
    this.members = members;
  }

  get type(): RoomType {
    return this.etc.type;
  }

  get directKey(): string | undefined {
    return this.etc.directKey;
  }

  get title(): string | undefined {
    return this.etc.title;
  }

  get lastMessageAt(): Date | undefined {
    return this.etc.lastMessageAt;
  }

  get pairId(): number | undefined {
    return this.etc.pairId;
  }

  static createDirectRoom(userId1: string, userId2: string, pairId?: number): RoomEntity {
    const sortedUserIds = [userId1, userId2].sort();
    const directKey = `${sortedUserIds[0]}-${sortedUserIds[1]}`;
    
    return new RoomEntity({
      type: RoomType.DIRECT,
      directKey,
      pairId
    });
  }

  static createGroupRoom(title: string): RoomEntity {
    return new RoomEntity({
      type: RoomType.GROUP,
      title
    });
  }

  updateLastMessage(): RoomEntity {
    return new RoomEntity({
      ...this.etc,
      lastMessageAt: new Date()
    }, this.members);
  }

  getTopicName(): string {
    return `room:${this.id}`;
  }

  isDirectRoom(): boolean {
    return this.type === RoomType.DIRECT;
  }

  isGroupRoom(): boolean {
    return this.type === RoomType.GROUP;
  }

  hasMembers(): boolean {
    return this.members.length > 0;
  }

  getMemberUserIds(): string[] {
    return this.members.map(member => member.userId);
  }
}