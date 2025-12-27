package room

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestNewRoom(t *testing.T) {
	// Given
	pairID := "pair-123"
	user1ID := "user-001"
	user2ID := "user-002"

	// When
	room := NewRoom(pairID, user1ID, user2ID)

	// Then
	assert.Equal(t, pairID, room.PairID)
	assert.Equal(t, user1ID, room.User1ID)
	assert.Equal(t, user2ID, room.User2ID)
	assert.Equal(t, string(RoomStatusActive), room.Status)
	assert.NotZero(t, room.CreatedAt)
	assert.NotZero(t, room.UpdatedAt)
}

func TestRoom_IsParticipant(t *testing.T) {
	tests := []struct {
		name     string
		room     *Room
		userID   string
		expected bool
	}{
		{
			name: "User1이 참여자인 경우",
			room: &Room{
				User1ID: "user-001",
				User2ID: "user-002",
			},
			userID:   "user-001",
			expected: true,
		},
		{
			name: "User2가 참여자인 경우",
			room: &Room{
				User1ID: "user-001",
				User2ID: "user-002",
			},
			userID:   "user-002",
			expected: true,
		},
		{
			name: "참여자가 아닌 경우",
			room: &Room{
				User1ID: "user-001",
				User2ID: "user-002",
			},
			userID:   "user-003",
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// When
			result := tt.room.IsParticipant(tt.userID)

			// Then
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestRoom_GetOtherUserID(t *testing.T) {
	tests := []struct {
		name     string
		room     *Room
		userID   string
		expected string
	}{
		{
			name: "User1이 주어졌을 때 User2 반환",
			room: &Room{
				User1ID: "user-001",
				User2ID: "user-002",
			},
			userID:   "user-001",
			expected: "user-002",
		},
		{
			name: "User2가 주어졌을 때 User1 반환",
			room: &Room{
				User1ID: "user-001",
				User2ID: "user-002",
			},
			userID:   "user-002",
			expected: "user-001",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// When
			result := tt.room.GetOtherUserID(tt.userID)

			// Then
			assert.Equal(t, tt.expected, result)
		})
	}
}

func TestRoom_TableName(t *testing.T) {
	// Given
	room := Room{}

	// When
	tableName := room.TableName()

	// Then
	assert.Equal(t, "chat_rooms", tableName)
}

func TestRoomStatus_Constants(t *testing.T) {
	assert.Equal(t, RoomStatus("ACTIVE"), RoomStatusActive)
	assert.Equal(t, RoomStatus("INACTIVE"), RoomStatusInactive)
	assert.Equal(t, RoomStatus("BLOCKED"), RoomStatusBlocked)
}
