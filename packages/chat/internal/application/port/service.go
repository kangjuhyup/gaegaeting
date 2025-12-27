package port

import (
	"context"
	"gaegaeting/chat/internal/domain/message"
	"gaegaeting/chat/internal/domain/room"
)

// MessageService 인터페이스
type MessageService interface {
	SendMessage(ctx context.Context, roomID, senderID, content string, msgType message.MessageType) (*message.Message, error)
	GetMessages(ctx context.Context, roomID string, limit, offset int) ([]*message.Message, error)
	MarkAsRead(ctx context.Context, messageID, userID string) error
	GetUnreadCount(ctx context.Context, roomID, userID string) (int64, error)
}

// RoomService 인터페이스
type RoomService interface {
	CreateRoom(ctx context.Context, pairID, user1ID, user2ID string) (*room.Room, error)
	GetRoom(ctx context.Context, roomID string) (*room.Room, error)
	GetUserRooms(ctx context.Context, userID string) ([]*room.Room, error)
	UpdateRoomStatus(ctx context.Context, roomID string, status room.RoomStatus) error
}
