package message

import (
	"testing"
)

func BenchmarkNewMessage(b *testing.B) {
	roomID := "room-123"
	senderID := "user-001"
	content := "벤치마크 테스트 메시지입니다."
	msgType := MessageTypeText

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		NewMessage(roomID, senderID, content, msgType)
	}
}

func BenchmarkMessage_MarkAsRead(b *testing.B) {
	msg := NewMessage("room-123", "user-001", "content", MessageTypeText)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		msg.MarkAsRead()
	}
}

func BenchmarkMessage_TableName(b *testing.B) {
	msg := Message{}

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = msg.TableName()
	}
}
