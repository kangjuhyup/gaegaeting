package service

import (
	"context"
	"errors"
	"testing"

	"gaegaeting/chat/internal/domain/message"
	"gaegaeting/chat/internal/domain/room"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockMessageRepository is a mock of MessageRepository
type MockMessageRepository struct {
	mock.Mock
}

func (m *MockMessageRepository) Create(ctx context.Context, msg *message.Message) error {
	args := m.Called(ctx, msg)
	return args.Error(0)
}

func (m *MockMessageRepository) FindByID(ctx context.Context, id string) (*message.Message, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*message.Message), args.Error(1)
}

func (m *MockMessageRepository) FindByRoomID(ctx context.Context, roomID string, limit, offset int) ([]*message.Message, error) {
	args := m.Called(ctx, roomID, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*message.Message), args.Error(1)
}

func (m *MockMessageRepository) Update(ctx context.Context, msg *message.Message) error {
	args := m.Called(ctx, msg)
	return args.Error(0)
}

func (m *MockMessageRepository) MarkAsRead(ctx context.Context, messageID string) error {
	args := m.Called(ctx, messageID)
	return args.Error(0)
}

func (m *MockMessageRepository) GetUnreadCount(ctx context.Context, roomID, userID string) (int64, error) {
	args := m.Called(ctx, roomID, userID)
	return args.Get(0).(int64), args.Error(1)
}

// MockEventPublisher is a mock of EventPublisher
type MockEventPublisher struct {
	mock.Mock
}

func (m *MockEventPublisher) PublishMessageCreated(ctx context.Context, msg *message.Message) error {
	args := m.Called(ctx, msg)
	return args.Error(0)
}

func (m *MockEventPublisher) PublishMessageRead(ctx context.Context, messageID, userID string) error {
	args := m.Called(ctx, messageID, userID)
	return args.Error(0)
}

func (m *MockEventPublisher) PublishRoomCreated(ctx context.Context, room *room.Room) error {
	args := m.Called(ctx, room)
	return args.Error(0)
}

// MockCacheRepository is a mock of CacheRepository
type MockCacheRepository struct {
	mock.Mock
}

func (m *MockCacheRepository) Set(ctx context.Context, key string, value interface{}, ttl int) error {
	args := m.Called(ctx, key, value, ttl)
	return args.Error(0)
}

func (m *MockCacheRepository) Get(ctx context.Context, key string) (string, error) {
	args := m.Called(ctx, key)
	return args.String(0), args.Error(1)
}

func (m *MockCacheRepository) Delete(ctx context.Context, key string) error {
	args := m.Called(ctx, key)
	return args.Error(0)
}

func TestMessageService_SendMessage(t *testing.T) {
	t.Run("성공: 메시지 전송", func(t *testing.T) {
		// Given
		mockRepo := new(MockMessageRepository)
		mockPublisher := new(MockEventPublisher)
		mockCache := new(MockCacheRepository)
		service := NewMessageService(mockRepo, mockPublisher, mockCache)

		ctx := context.Background()
		roomID := "room-123"
		senderID := "user-001"
		content := "안녕하세요!"
		msgType := message.MessageTypeText

		mockRepo.On("Create", ctx, mock.AnythingOfType("*message.Message")).Return(nil)
		mockPublisher.On("PublishMessageCreated", ctx, mock.AnythingOfType("*message.Message")).Return(nil)

		// When
		msg, err := service.SendMessage(ctx, roomID, senderID, content, msgType)

		// Then
		assert.NoError(t, err)
		assert.NotNil(t, msg)
		assert.Equal(t, roomID, msg.RoomID)
		assert.Equal(t, senderID, msg.SenderID)
		assert.Equal(t, content, msg.Content)
		assert.NotEmpty(t, msg.ID)
		mockRepo.AssertExpectations(t)
		mockPublisher.AssertExpectations(t)
	})

	t.Run("실패: Repository 에러", func(t *testing.T) {
		// Given
		mockRepo := new(MockMessageRepository)
		mockPublisher := new(MockEventPublisher)
		mockCache := new(MockCacheRepository)
		service := NewMessageService(mockRepo, mockPublisher, mockCache)

		ctx := context.Background()
		expectedErr := errors.New("database error")

		mockRepo.On("Create", ctx, mock.AnythingOfType("*message.Message")).Return(expectedErr)

		// When
		msg, err := service.SendMessage(ctx, "room-123", "user-001", "content", message.MessageTypeText)

		// Then
		assert.Error(t, err)
		assert.Nil(t, msg)
		assert.Contains(t, err.Error(), "failed to create message")
		mockRepo.AssertExpectations(t)
	})
}

func TestMessageService_GetMessages(t *testing.T) {
	t.Run("성공: 메시지 목록 조회", func(t *testing.T) {
		// Given
		mockRepo := new(MockMessageRepository)
		mockPublisher := new(MockEventPublisher)
		mockCache := new(MockCacheRepository)
		service := NewMessageService(mockRepo, mockPublisher, mockCache)

		ctx := context.Background()
		roomID := "room-123"
		limit := 10
		offset := 0

		expectedMessages := []*message.Message{
			{ID: "msg-001", RoomID: roomID, Content: "Message 1"},
			{ID: "msg-002", RoomID: roomID, Content: "Message 2"},
		}

		mockRepo.On("FindByRoomID", ctx, roomID, limit, offset).Return(expectedMessages, nil)

		// When
		messages, err := service.GetMessages(ctx, roomID, limit, offset)

		// Then
		assert.NoError(t, err)
		assert.Len(t, messages, 2)
		assert.Equal(t, expectedMessages, messages)
		mockRepo.AssertExpectations(t)
	})

	t.Run("실패: Repository 에러", func(t *testing.T) {
		// Given
		mockRepo := new(MockMessageRepository)
		mockPublisher := new(MockEventPublisher)
		mockCache := new(MockCacheRepository)
		service := NewMessageService(mockRepo, mockPublisher, mockCache)

		ctx := context.Background()
		expectedErr := errors.New("database error")

		mockRepo.On("FindByRoomID", ctx, "room-123", 10, 0).Return(nil, expectedErr)

		// When
		messages, err := service.GetMessages(ctx, "room-123", 10, 0)

		// Then
		assert.Error(t, err)
		assert.Nil(t, messages)
		mockRepo.AssertExpectations(t)
	})
}

func TestMessageService_MarkAsRead(t *testing.T) {
	t.Run("성공: 메시지 읽음 처리", func(t *testing.T) {
		// Given
		mockRepo := new(MockMessageRepository)
		mockPublisher := new(MockEventPublisher)
		mockCache := new(MockCacheRepository)
		service := NewMessageService(mockRepo, mockPublisher, mockCache)

		ctx := context.Background()
		messageID := "msg-001"
		userID := "user-001"

		mockRepo.On("MarkAsRead", ctx, messageID).Return(nil)
		mockPublisher.On("PublishMessageRead", ctx, messageID, userID).Return(nil)

		// When
		err := service.MarkAsRead(ctx, messageID, userID)

		// Then
		assert.NoError(t, err)
		mockRepo.AssertExpectations(t)
		mockPublisher.AssertExpectations(t)
	})

	t.Run("실패: Repository 에러", func(t *testing.T) {
		// Given
		mockRepo := new(MockMessageRepository)
		mockPublisher := new(MockEventPublisher)
		mockCache := new(MockCacheRepository)
		service := NewMessageService(mockRepo, mockPublisher, mockCache)

		ctx := context.Background()
		expectedErr := errors.New("database error")

		mockRepo.On("MarkAsRead", ctx, "msg-001").Return(expectedErr)

		// When
		err := service.MarkAsRead(ctx, "msg-001", "user-001")

		// Then
		assert.Error(t, err)
		mockRepo.AssertExpectations(t)
	})
}

func TestMessageService_GetUnreadCount(t *testing.T) {
	t.Run("성공: 안읽은 메시지 수 조회", func(t *testing.T) {
		// Given
		mockRepo := new(MockMessageRepository)
		mockPublisher := new(MockEventPublisher)
		mockCache := new(MockCacheRepository)
		service := NewMessageService(mockRepo, mockPublisher, mockCache)

		ctx := context.Background()
		roomID := "room-123"
		userID := "user-001"
		expectedCount := int64(5)

		mockRepo.On("GetUnreadCount", ctx, roomID, userID).Return(expectedCount, nil)

		// When
		count, err := service.GetUnreadCount(ctx, roomID, userID)

		// Then
		assert.NoError(t, err)
		assert.Equal(t, expectedCount, count)
		mockRepo.AssertExpectations(t)
	})

	t.Run("실패: Repository 에러", func(t *testing.T) {
		// Given
		mockRepo := new(MockMessageRepository)
		mockPublisher := new(MockEventPublisher)
		mockCache := new(MockCacheRepository)
		service := NewMessageService(mockRepo, mockPublisher, mockCache)

		ctx := context.Background()
		expectedErr := errors.New("database error")

		mockRepo.On("GetUnreadCount", ctx, "room-123", "user-001").Return(int64(0), expectedErr)

		// When
		count, err := service.GetUnreadCount(ctx, "room-123", "user-001")

		// Then
		assert.Error(t, err)
		assert.Equal(t, int64(0), count)
		mockRepo.AssertExpectations(t)
	})
}
