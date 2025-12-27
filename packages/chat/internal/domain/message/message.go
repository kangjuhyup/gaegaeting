package message

import (
	"time"
)

type Message struct {
	ID        string    `json:"id" gorm:"primaryKey;type:varchar(36)"`
	RoomID    string    `json:"roomId" gorm:"type:varchar(36);index"`
	SenderID  string    `json:"senderId" gorm:"type:varchar(36);index"`
	Content   string    `json:"content" gorm:"type:text"`
	Type      string    `json:"type" gorm:"type:varchar(20)"`
	IsRead    bool      `json:"isRead" gorm:"default:false"`
	CreatedAt time.Time `json:"createdAt" gorm:"index"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type MessageType string

const (
	MessageTypeText  MessageType = "TEXT"
	MessageTypeImage MessageType = "IMAGE"
	MessageTypeFile  MessageType = "FILE"
)

func (Message) TableName() string {
	return "chat_messages"
}

func NewMessage(roomID, senderID, content string, messageType MessageType) *Message {
	return &Message{
		RoomID:    roomID,
		SenderID:  senderID,
		Content:   content,
		Type:      string(messageType),
		IsRead:    false,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
}

func (m *Message) MarkAsRead() {
	m.IsRead = true
	m.UpdatedAt = time.Now()
}
