package repository

import (
	"context"
	"gaegaeting/chat/internal/domain/message"

	"gorm.io/gorm"
)

type MessageRepository struct {
	db *gorm.DB
}

func NewMessageRepository(db *gorm.DB) *MessageRepository {
	return &MessageRepository{db: db}
}

func (r *MessageRepository) Create(ctx context.Context, msg *message.Message) error {
	return r.db.WithContext(ctx).Create(msg).Error
}

func (r *MessageRepository) FindByID(ctx context.Context, id string) (*message.Message, error) {
	var msg message.Message
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&msg).Error
	if err != nil {
		return nil, err
	}
	return &msg, nil
}

func (r *MessageRepository) FindByRoomID(ctx context.Context, roomID string, limit, offset int) ([]*message.Message, error) {
	var messages []*message.Message
	err := r.db.WithContext(ctx).
		Where("room_id = ?", roomID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&messages).Error
	if err != nil {
		return nil, err
	}
	return messages, nil
}

func (r *MessageRepository) Update(ctx context.Context, msg *message.Message) error {
	return r.db.WithContext(ctx).Save(msg).Error
}

func (r *MessageRepository) MarkAsRead(ctx context.Context, messageID string) error {
	return r.db.WithContext(ctx).
		Model(&message.Message{}).
		Where("id = ?", messageID).
		Update("is_read", true).Error
}

func (r *MessageRepository) GetUnreadCount(ctx context.Context, roomID, userID string) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&message.Message{}).
		Where("room_id = ? AND sender_id != ? AND is_read = ?", roomID, userID, false).
		Count(&count).Error
	return count, err
}
