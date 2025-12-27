package service

import (
	"context"
	"fmt"

	"gaegaeting/chat/internal/application/port"
	"gaegaeting/chat/internal/domain/room"

	"github.com/google/uuid"
)

type RoomService struct {
	repo      port.RoomRepository
	publisher port.EventPublisher
	cache     port.CacheRepository
}

func NewRoomService(
	repo port.RoomRepository,
	publisher port.EventPublisher,
	cache port.CacheRepository,
) *RoomService {
	return &RoomService{
		repo:      repo,
		publisher: publisher,
		cache:     cache,
	}
}

func (s *RoomService) CreateRoom(ctx context.Context, pairID, user1ID, user2ID string) (*room.Room, error) {
	// Check if room already exists for this pair
	existingRoom, err := s.repo.FindByPairID(ctx, pairID)
	if err == nil && existingRoom != nil {
		return existingRoom, nil
	}

	r := room.NewRoom(pairID, user1ID, user2ID)
	r.ID = uuid.New().String()

	if err := s.repo.Create(ctx, r); err != nil {
		return nil, fmt.Errorf("failed to create room: %w", err)
	}

	// Publish event
	if err := s.publisher.PublishRoomCreated(ctx, r); err != nil {
		fmt.Printf("Failed to publish room created event: %v\n", err)
	}

	return r, nil
}

func (s *RoomService) GetRoom(ctx context.Context, roomID string) (*room.Room, error) {
	r, err := s.repo.FindByID(ctx, roomID)
	if err != nil {
		return nil, fmt.Errorf("failed to get room: %w", err)
	}
	return r, nil
}

func (s *RoomService) GetUserRooms(ctx context.Context, userID string) ([]*room.Room, error) {
	rooms, err := s.repo.FindByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user rooms: %w", err)
	}
	return rooms, nil
}

func (s *RoomService) UpdateRoomStatus(ctx context.Context, roomID string, status room.RoomStatus) error {
	r, err := s.repo.FindByID(ctx, roomID)
	if err != nil {
		return fmt.Errorf("failed to get room: %w", err)
	}

	r.Status = string(status)
	if err := s.repo.Update(ctx, r); err != nil {
		return fmt.Errorf("failed to update room: %w", err)
	}

	return nil
}
