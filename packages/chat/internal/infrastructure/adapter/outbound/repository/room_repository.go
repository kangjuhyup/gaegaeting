package repository

import (
	"context"
	"gaegaeting/chat/internal/domain/room"

	"gorm.io/gorm"
)

type RoomRepository struct {
	db *gorm.DB
}

func NewRoomRepository(db *gorm.DB) *RoomRepository {
	return &RoomRepository{db: db}
}

func (r *RoomRepository) Create(ctx context.Context, room *room.Room) error {
	return r.db.WithContext(ctx).Create(room).Error
}

func (r *RoomRepository) FindByID(ctx context.Context, id string) (*room.Room, error) {
	var rm room.Room
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&rm).Error
	if err != nil {
		return nil, err
	}
	return &rm, nil
}

func (r *RoomRepository) FindByPairID(ctx context.Context, pairID string) (*room.Room, error) {
	var rm room.Room
	err := r.db.WithContext(ctx).Where("pair_id = ?", pairID).First(&rm).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, nil
		}
		return nil, err
	}
	return &rm, nil
}

func (r *RoomRepository) FindByUserID(ctx context.Context, userID string) ([]*room.Room, error) {
	var rooms []*room.Room
	err := r.db.WithContext(ctx).
		Where("user1_id = ? OR user2_id = ?", userID, userID).
		Order("updated_at DESC").
		Find(&rooms).Error
	if err != nil {
		return nil, err
	}
	return rooms, nil
}

func (r *RoomRepository) Update(ctx context.Context, room *room.Room) error {
	return r.db.WithContext(ctx).Save(room).Error
}

func (r *RoomRepository) Delete(ctx context.Context, id string) error {
	return r.db.WithContext(ctx).Delete(&room.Room{}, "id = ?", id).Error
}
