import { PersistenceEntity } from '@core/model';

export enum MessageKind {
  TEXT = 1,
  SYSTEM = 2,
  NOTICE = 3
}

export interface IMessage {
  roomId: number;
  senderId: string;
  kind: MessageKind;
  body?: string;
  payload?: any;
  sentAt: Date;
  editedAt?: Date;
  deletedAt?: Date;
}

export class MessageEntity extends PersistenceEntity<number, IMessage> {

  constructor(param: IMessage) {
    super(param);
  }

  get roomId(): number {
    return this.etc.roomId;
  }

  get senderId(): string {
    return this.etc.senderId;
  }

  get kind(): MessageKind {
    return this.etc.kind;
  }

  get body(): string | undefined {
    return this.etc.body;
  }

  get payload(): any {
    return this.etc.payload;
  }

  get sentAt(): Date {
    return this.etc.sentAt;
  }

  get editedAt(): Date | undefined {
    return this.etc.editedAt;
  }

  get deletedAt(): Date | undefined {
    return this.etc.deletedAt;
  }

  static createTextMessage(roomId: number, senderId: string, body: string): MessageEntity {
    return new MessageEntity({
      roomId,
      senderId,
      kind: MessageKind.TEXT,
      body,
      sentAt: new Date()
    });
  }

  static createSystemMessage(roomId: number, payload: any): MessageEntity {
    return new MessageEntity({
      roomId,
      senderId: 'system',
      kind: MessageKind.SYSTEM,
      payload,
      sentAt: new Date()
    });
  }

  edit(newBody: string): MessageEntity {
    return new MessageEntity({
      ...this.etc,
      body: newBody,
      editedAt: new Date()
    });
  }

  delete(): MessageEntity {
    return new MessageEntity({
      ...this.etc,
      deletedAt: new Date()
    });
  }

  isDeleted(): boolean {
    return !!this.deletedAt;
  }

  isEdited(): boolean {
    return !!this.editedAt;
  }

  isTextMessage(): boolean {
    return this.kind === MessageKind.TEXT;
  }

  isSystemMessage(): boolean {
    return this.kind === MessageKind.SYSTEM;
  }

  getTopicName(): string {
    return `room:${this.roomId}`;
  }
}