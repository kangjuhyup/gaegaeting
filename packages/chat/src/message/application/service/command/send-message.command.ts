import { CommandHandler, ICommandHandler, EventBus } from "@nestjs/cqrs";
import { SendMessageCommand } from "../../port/command/send-message.port";
import { MessageEntity } from "@app/message/domain/model/message";
import { MessageRepositoryPort } from "@app/message/domain/port/message-repository.port";
import { RoomRepositoryPort } from "@app/room/domain/port/room-repository.port";
import { RedisPubSubService } from "@core/redis";
import { Transactional } from "@core/database";

@CommandHandler(SendMessageCommand)
export class SendMessageHandler implements ICommandHandler<SendMessageCommand, MessageEntity> {
  constructor(
    private readonly messageRepository: MessageRepositoryPort,
    private readonly roomRepository: RoomRepositoryPort,
    private readonly pubSubService: RedisPubSubService
  ) {}

  @Transactional()
  async execute(command: SendMessageCommand): Promise<MessageEntity> {
    // Verify room exists and user is member
    const room = await this.roomRepository.selectRoomFromIdWithMembers(command.roomId);
    if (!room) {
      throw new Error("Room not found");
    }

    const isMember = room.getMemberUserIds().includes(command.senderId);
    if (!isMember) {
      throw new Error("User is not a member of this room");
    }

    // Create and save message
    const message = MessageEntity.createTextMessage(command.roomId, command.senderId, command.body);
    const savedMessage = await this.messageRepository.insertMessage(message);

    // Update room last message
    await this.roomRepository.updateRoomLastMessage(command.roomId, savedMessage.id);

    // Publish message via Redis Pub/Sub
    const topicName = room.getTopicName();
    await this.pubSubService.publish(topicName, {
      type: 'new_message',
      messageId: savedMessage.id,
      roomId: command.roomId,
      senderId: command.senderId,
      body: command.body,
      sentAt: savedMessage.sentAt
    });

    return savedMessage;
  }
}