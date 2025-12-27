package room

import (
	"time"
)

type Room struct {
	ID          string    `json:"id" gorm:"primaryKey;type:varchar(36)"`
	PairID      string    `json:"pairId" gorm:"type:varchar(36);index"`
	User1ID     string    `json:"user1Id" gorm:"type:varchar(36);index"`
	User2ID     string    `json:"user2Id" gorm:"type:varchar(36);index"`
	Status      string    `json:"status" gorm:"type:varchar(20)"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type RoomStatus string

const (
	RoomStatusActive   RoomStatus = "ACTIVE"
	RoomStatusInactive RoomStatus = "INACTIVE"
	RoomStatusBlocked  RoomStatus = "BLOCKED"
)

func (Room) TableName() string {
	return "chat_rooms"
}

func NewRoom(pairID, user1ID, user2ID string) *Room {
	return &Room{
		PairID:    pairID,
		User1ID:   user1ID,
		User2ID:   user2ID,
		Status:    string(RoomStatusActive),
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
}

func (r *Room) IsParticipant(userID string) bool {
	return r.User1ID == userID || r.User2ID == userID
}

func (r *Room) GetOtherUserID(userID string) string {
	if r.User1ID == userID {
		return r.User2ID
	}
	return r.User1ID
}
