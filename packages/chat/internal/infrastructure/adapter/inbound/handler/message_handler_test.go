package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"gaegaeting/chat/internal/domain/message"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
)

// MockMessageService is a mock of MessageService
type MockMessageService struct {
	mock.Mock
}

func (m *MockMessageService) SendMessage(ctx context.Context, roomID, senderID, content string, msgType message.MessageType) (*message.Message, error) {
	args := m.Called(ctx, roomID, senderID, content, msgType)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*message.Message), args.Error(1)
}

func (m *MockMessageService) GetMessages(ctx context.Context, roomID string, limit, offset int) ([]*message.Message, error) {
	args := m.Called(ctx, roomID, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*message.Message), args.Error(1)
}

func (m *MockMessageService) MarkAsRead(ctx context.Context, messageID, userID string) error {
	args := m.Called(ctx, messageID, userID)
	return args.Error(0)
}

func (m *MockMessageService) GetUnreadCount(ctx context.Context, roomID, userID string) (int64, error) {
	args := m.Called(ctx, roomID, userID)
	return args.Get(0).(int64), args.Error(1)
}

func setupTestRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return gin.New()
}

func TestMessageHandler_SendMessage(t *testing.T) {
	t.Run("성공: 메시지 전송", func(t *testing.T) {
		// Given
		mockService := new(MockMessageService)
		handler := NewMessageHandler(mockService)
		router := setupTestRouter()
		router.POST("/messages", handler.SendMessage)

		expectedMsg := &message.Message{
			ID:       "msg-001",
			RoomID:   "room-123",
			SenderID: "user-001",
			Content:  "안녕하세요!",
			Type:     string(message.MessageTypeText),
		}

		mockService.On("SendMessage",
			mock.Anything,
			"room-123",
			"user-001",
			"안녕하세요!",
			message.MessageTypeText,
		).Return(expectedMsg, nil)

		requestBody := SendMessageRequest{
			RoomID:   "room-123",
			SenderID: "user-001",
			Content:  "안녕하세요!",
			Type:     "TEXT",
		}
		body, _ := json.Marshal(requestBody)

		// When
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/messages", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(w, req)

		// Then
		assert.Equal(t, http.StatusCreated, w.Code)

		var response message.Message
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.Equal(t, expectedMsg.ID, response.ID)
		assert.Equal(t, expectedMsg.Content, response.Content)
		mockService.AssertExpectations(t)
	})

	t.Run("실패: 잘못된 요청 데이터", func(t *testing.T) {
		// Given
		mockService := new(MockMessageService)
		handler := NewMessageHandler(mockService)
		router := setupTestRouter()
		router.POST("/messages", handler.SendMessage)

		invalidBody := []byte(`{"invalid": "data"}`)

		// When
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/messages", bytes.NewBuffer(invalidBody))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(w, req)

		// Then
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})

	t.Run("실패: 서비스 에러", func(t *testing.T) {
		// Given
		mockService := new(MockMessageService)
		handler := NewMessageHandler(mockService)
		router := setupTestRouter()
		router.POST("/messages", handler.SendMessage)

		mockService.On("SendMessage",
			mock.Anything,
			mock.Anything,
			mock.Anything,
			mock.Anything,
			mock.Anything,
		).Return(nil, errors.New("service error"))

		requestBody := SendMessageRequest{
			RoomID:   "room-123",
			SenderID: "user-001",
			Content:  "안녕하세요!",
			Type:     "TEXT",
		}
		body, _ := json.Marshal(requestBody)

		// When
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("POST", "/messages", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		router.ServeHTTP(w, req)

		// Then
		assert.Equal(t, http.StatusInternalServerError, w.Code)
		mockService.AssertExpectations(t)
	})
}

func TestMessageHandler_GetMessages(t *testing.T) {
	t.Run("성공: 메시지 목록 조회", func(t *testing.T) {
		// Given
		mockService := new(MockMessageService)
		handler := NewMessageHandler(mockService)
		router := setupTestRouter()
		router.GET("/messages/room/:roomId", handler.GetMessages)

		expectedMessages := []*message.Message{
			{ID: "msg-001", RoomID: "room-123", Content: "Message 1"},
			{ID: "msg-002", RoomID: "room-123", Content: "Message 2"},
		}

		mockService.On("GetMessages", mock.Anything, "room-123", 50, 0).
			Return(expectedMessages, nil)

		// When
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/messages/room/room-123", nil)
		router.ServeHTTP(w, req)

		// Then
		assert.Equal(t, http.StatusOK, w.Code)

		var response []*message.Message
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.Len(t, response, 2)
		mockService.AssertExpectations(t)
	})

	t.Run("성공: 커스텀 limit과 offset", func(t *testing.T) {
		// Given
		mockService := new(MockMessageService)
		handler := NewMessageHandler(mockService)
		router := setupTestRouter()
		router.GET("/messages/room/:roomId", handler.GetMessages)

		mockService.On("GetMessages", mock.Anything, "room-123", 10, 20).
			Return([]*message.Message{}, nil)

		// When
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/messages/room/room-123?limit=10&offset=20", nil)
		router.ServeHTTP(w, req)

		// Then
		assert.Equal(t, http.StatusOK, w.Code)
		mockService.AssertExpectations(t)
	})
}

func TestMessageHandler_MarkAsRead(t *testing.T) {
	t.Run("성공: 메시지 읽음 처리", func(t *testing.T) {
		// Given
		mockService := new(MockMessageService)
		handler := NewMessageHandler(mockService)
		router := setupTestRouter()

		// JWT 인증을 시뮬레이션하기 위한 미들웨어
		router.Use(func(c *gin.Context) {
			c.Set("userId", "user-001")
			c.Next()
		})
		router.PATCH("/messages/:messageId/read", handler.MarkAsRead)

		mockService.On("MarkAsRead", mock.Anything, "msg-001", "user-001").
			Return(nil)

		// When
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("PATCH", "/messages/msg-001/read", nil)
		router.ServeHTTP(w, req)

		// Then
		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]string
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.Equal(t, "message marked as read", response["message"])
		mockService.AssertExpectations(t)
	})
}

func TestMessageHandler_GetUnreadCount(t *testing.T) {
	t.Run("성공: 안읽은 메시지 수 조회", func(t *testing.T) {
		// Given
		mockService := new(MockMessageService)
		handler := NewMessageHandler(mockService)
		router := setupTestRouter()

		router.Use(func(c *gin.Context) {
			c.Set("userId", "user-001")
			c.Next()
		})
		router.GET("/messages/room/:roomId/unread-count", handler.GetUnreadCount)

		mockService.On("GetUnreadCount", mock.Anything, "room-123", "user-001").
			Return(int64(5), nil)

		// When
		w := httptest.NewRecorder()
		req, _ := http.NewRequest("GET", "/messages/room/room-123/unread-count", nil)
		router.ServeHTTP(w, req)

		// Then
		assert.Equal(t, http.StatusOK, w.Code)

		var response map[string]int64
		json.Unmarshal(w.Body.Bytes(), &response)
		assert.Equal(t, int64(5), response["count"])
		mockService.AssertExpectations(t)
	})
}
