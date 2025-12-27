package port

import (
	"context"
	"gaegaeting/chat/internal/domain/message"
	"gaegaeting/chat/internal/domain/room"
)

type MessageRepository interface {
	Create(ctx context.Context, msg *message.Message) error
	FindByID(ctx context.Context, id string) (*message.Message, error)
	FindByRoomID(ctx context.Context, roomID string, limit, offset int) ([]*message.Message, error)
	Update(ctx context.Context, msg *message.Message) error
	MarkAsRead(ctx context.Context, messageID string) error
	GetUnreadCount(ctx context.Context, roomID, userID string) (int64, error)
}

type RoomRepository interface {
	Create(ctx context.Context, room *room.Room) error
	FindByID(ctx context.Context, id string) (*room.Room, error)
	FindByPairID(ctx context.Context, pairID string) (*room.Room, error)
	FindByUserID(ctx context.Context, userID string) ([]*room.Room, error)
	Update(ctx context.Context, room *room.Room) error
	Delete(ctx context.Context, id string) error
}

type CacheRepository interface {
	Set(ctx context.Context, key string, value interface{}, ttl int) error
	Get(ctx context.Context, key string) (string, error)
	Delete(ctx context.Context, key string) error
}

type EventPublisher interface {
	PublishMessageCreated(ctx context.Context, msg *message.Message) error
	PublishMessageRead(ctx context.Context, messageID, userID string) error
	PublishRoomCreated(ctx context.Context, room *room.Room) error
}
