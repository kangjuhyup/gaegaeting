package service

import (
	"context"
	"fmt"

	"gaegaeting/chat/internal/application/port"
	"gaegaeting/chat/internal/domain/message"

	"github.com/google/uuid"
)

type MessageService struct {
	repo      port.MessageRepository
	publisher port.EventPublisher
	cache     port.CacheRepository
}

func NewMessageService(
	repo port.MessageRepository,
	publisher port.EventPublisher,
	cache port.CacheRepository,
) *MessageService {
	return &MessageService{
		repo:      repo,
		publisher: publisher,
		cache:     cache,
	}
}

func (s *MessageService) SendMessage(ctx context.Context, roomID, senderID, content string, msgType message.MessageType) (*message.Message, error) {
	msg := message.NewMessage(roomID, senderID, content, msgType)
	msg.ID = uuid.New().String()

	if err := s.repo.Create(ctx, msg); err != nil {
		return nil, fmt.Errorf("failed to create message: %w", err)
	}

	// Publish event
	if err := s.publisher.PublishMessageCreated(ctx, msg); err != nil {
		// Log error but don't fail the request
		fmt.Printf("Failed to publish message created event: %v\n", err)
	}

	return msg, nil
}

func (s *MessageService) GetMessages(ctx context.Context, roomID string, limit, offset int) ([]*message.Message, error) {
	messages, err := s.repo.FindByRoomID(ctx, roomID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("failed to get messages: %w", err)
	}
	return messages, nil
}

func (s *MessageService) MarkAsRead(ctx context.Context, messageID, userID string) error {
	if err := s.repo.MarkAsRead(ctx, messageID); err != nil {
		return fmt.Errorf("failed to mark message as read: %w", err)
	}

	// Publish event
	if err := s.publisher.PublishMessageRead(ctx, messageID, userID); err != nil {
		fmt.Printf("Failed to publish message read event: %v\n", err)
	}

	return nil
}

func (s *MessageService) GetUnreadCount(ctx context.Context, roomID, userID string) (int64, error) {
	count, err := s.repo.GetUnreadCount(ctx, roomID, userID)
	if err != nil {
		return 0, fmt.Errorf("failed to get unread count: %w", err)
	}
	return count, nil
}
