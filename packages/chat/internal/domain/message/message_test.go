package message

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestNewMessage(t *testing.T) {
	// Given
	roomID := "room-123"
	senderID := "user-001"
	content := "안녕하세요!"
	msgType := MessageTypeText

	// When
	msg := NewMessage(roomID, senderID, content, msgType)

	// Then
	assert.Equal(t, roomID, msg.RoomID)
	assert.Equal(t, senderID, msg.SenderID)
	assert.Equal(t, content, msg.Content)
	assert.Equal(t, string(MessageTypeText), msg.Type)
	assert.False(t, msg.IsRead)
	assert.NotZero(t, msg.CreatedAt)
	assert.NotZero(t, msg.UpdatedAt)
}

func TestMessage_MarkAsRead(t *testing.T) {
	// Given
	msg := &Message{
		ID:        "msg-001",
		RoomID:    "room-123",
		SenderID:  "user-001",
		Content:   "Test message",
		Type:      string(MessageTypeText),
		IsRead:    false,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	beforeUpdate := msg.UpdatedAt

	// When
	time.Sleep(10 * time.Millisecond) // Ensure time difference
	msg.MarkAsRead()

	// Then
	assert.True(t, msg.IsRead)
	assert.True(t, msg.UpdatedAt.After(beforeUpdate), "UpdatedAt should be updated")
}

func TestMessage_TableName(t *testing.T) {
	// Given
	msg := Message{}

	// When
	tableName := msg.TableName()

	// Then
	assert.Equal(t, "chat_messages", tableName)
}

func TestMessageType_Constants(t *testing.T) {
	assert.Equal(t, MessageType("TEXT"), MessageTypeText)
	assert.Equal(t, MessageType("IMAGE"), MessageTypeImage)
	assert.Equal(t, MessageType("FILE"), MessageTypeFile)
}

func TestNewMessage_DifferentTypes(t *testing.T) {
	tests := []struct {
		name     string
		msgType  MessageType
		expected string
	}{
		{
			name:     "텍스트 메시지",
			msgType:  MessageTypeText,
			expected: "TEXT",
		},
		{
			name:     "이미지 메시지",
			msgType:  MessageTypeImage,
			expected: "IMAGE",
		},
		{
			name:     "파일 메시지",
			msgType:  MessageTypeFile,
			expected: "FILE",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// When
			msg := NewMessage("room-123", "user-001", "content", tt.msgType)

			// Then
			assert.Equal(t, tt.expected, msg.Type)
		})
	}
}
