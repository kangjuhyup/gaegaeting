// +build integration

package integration

import (
	"context"
	"testing"
	"time"

	"gaegaeting/chat/internal/domain/message"
	"gaegaeting/chat/internal/domain/room"
	"gaegaeting/chat/internal/infrastructure/adapter/outbound/repository"
	"gaegaeting/chat/internal/infrastructure/config"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
	"gorm.io/gorm"
)

type MessageIntegrationTestSuite struct {
	suite.Suite
	db          *gorm.DB
	messageRepo *repository.MessageRepository
	roomRepo    *repository.RoomRepository
	ctx         context.Context
}

func (suite *MessageIntegrationTestSuite) SetupSuite() {
	// 테스트용 DB 설정
	cfg := config.DatabaseConfig{
		Host:     "localhost",
		Port:     3306,
		User:     "root",
		Password: "root",
		Database: "gaegaeting_test",
	}

	db, err := repository.NewDatabase(cfg)
	if err != nil {
		suite.T().Fatal("Failed to connect to test database:", err)
	}

	suite.db = db
	suite.messageRepo = repository.NewMessageRepository(db)
	suite.roomRepo = repository.NewRoomRepository(db)
	suite.ctx = context.Background()
}

func (suite *MessageIntegrationTestSuite) SetupTest() {
	// 각 테스트 전에 데이터 정리
	suite.db.Exec("DELETE FROM chat_messages")
	suite.db.Exec("DELETE FROM chat_rooms")
}

func (suite *MessageIntegrationTestSuite) TearDownSuite() {
	// 테스트 종료 후 정리
	suite.db.Exec("DROP TABLE IF EXISTS chat_messages")
	suite.db.Exec("DROP TABLE IF EXISTS chat_rooms")
}

func (suite *MessageIntegrationTestSuite) TestCreateAndFindMessage() {
	// Given: 채팅방 생성
	testRoom := &room.Room{
		ID:      uuid.New().String(),
		PairID:  "pair-123",
		User1ID: "user-001",
		User2ID: "user-002",
		Status:  string(room.RoomStatusActive),
	}
	err := suite.roomRepo.Create(suite.ctx, testRoom)
	assert.NoError(suite.T(), err)

	// 메시지 생성
	testMsg := &message.Message{
		ID:       uuid.New().String(),
		RoomID:   testRoom.ID,
		SenderID: "user-001",
		Content:  "통합 테스트 메시지",
		Type:     string(message.MessageTypeText),
		IsRead:   false,
	}

	// When: 메시지 저장
	err = suite.messageRepo.Create(suite.ctx, testMsg)
	assert.NoError(suite.T(), err)

	// Then: 메시지 조회
	foundMsg, err := suite.messageRepo.FindByID(suite.ctx, testMsg.ID)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), testMsg.Content, foundMsg.Content)
	assert.Equal(suite.T(), testMsg.RoomID, foundMsg.RoomID)
	assert.Equal(suite.T(), testMsg.SenderID, foundMsg.SenderID)
}

func (suite *MessageIntegrationTestSuite) TestFindMessagesByRoomID() {
	// Given: 채팅방과 여러 메시지 생성
	testRoom := &room.Room{
		ID:      uuid.New().String(),
		PairID:  "pair-123",
		User1ID: "user-001",
		User2ID: "user-002",
		Status:  string(room.RoomStatusActive),
	}
	suite.roomRepo.Create(suite.ctx, testRoom)

	// 3개의 메시지 생성
	for i := 0; i < 3; i++ {
		msg := &message.Message{
			ID:       uuid.New().String(),
			RoomID:   testRoom.ID,
			SenderID: "user-001",
			Content:  "Message " + string(rune(i)),
			Type:     string(message.MessageTypeText),
		}
		suite.messageRepo.Create(suite.ctx, msg)
		time.Sleep(10 * time.Millisecond) // 시간 차이를 위해
	}

	// When: 채팅방의 메시지 조회
	messages, err := suite.messageRepo.FindByRoomID(suite.ctx, testRoom.ID, 10, 0)

	// Then
	assert.NoError(suite.T(), err)
	assert.Len(suite.T(), messages, 3)
}

func (suite *MessageIntegrationTestSuite) TestMarkAsRead() {
	// Given: 채팅방과 메시지 생성
	testRoom := &room.Room{
		ID:      uuid.New().String(),
		PairID:  "pair-123",
		User1ID: "user-001",
		User2ID: "user-002",
		Status:  string(room.RoomStatusActive),
	}
	suite.roomRepo.Create(suite.ctx, testRoom)

	testMsg := &message.Message{
		ID:       uuid.New().String(),
		RoomID:   testRoom.ID,
		SenderID: "user-001",
		Content:  "읽지 않은 메시지",
		Type:     string(message.MessageTypeText),
		IsRead:   false,
	}
	suite.messageRepo.Create(suite.ctx, testMsg)

	// When: 읽음 처리
	err := suite.messageRepo.MarkAsRead(suite.ctx, testMsg.ID)
	assert.NoError(suite.T(), err)

	// Then: 읽음 상태 확인
	foundMsg, _ := suite.messageRepo.FindByID(suite.ctx, testMsg.ID)
	assert.True(suite.T(), foundMsg.IsRead)
}

func (suite *MessageIntegrationTestSuite) TestGetUnreadCount() {
	// Given: 채팅방과 메시지들 생성
	testRoom := &room.Room{
		ID:      uuid.New().String(),
		PairID:  "pair-123",
		User1ID: "user-001",
		User2ID: "user-002",
		Status:  string(room.RoomStatusActive),
	}
	suite.roomRepo.Create(suite.ctx, testRoom)

	// user-002가 보낸 안읽은 메시지 3개
	for i := 0; i < 3; i++ {
		msg := &message.Message{
			ID:       uuid.New().String(),
			RoomID:   testRoom.ID,
			SenderID: "user-002",
			Content:  "Unread message",
			Type:     string(message.MessageTypeText),
			IsRead:   false,
		}
		suite.messageRepo.Create(suite.ctx, msg)
	}

	// user-001이 보낸 메시지 1개 (카운트 안됨)
	msg := &message.Message{
		ID:       uuid.New().String(),
		RoomID:   testRoom.ID,
		SenderID: "user-001",
		Content:  "My message",
		Type:     string(message.MessageTypeText),
		IsRead:   false,
	}
	suite.messageRepo.Create(suite.ctx, msg)

	// When: user-001의 안읽은 메시지 수 조회
	count, err := suite.messageRepo.GetUnreadCount(suite.ctx, testRoom.ID, "user-001")

	// Then
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), int64(3), count)
}

func TestMessageIntegrationTestSuite(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test")
	}
	suite.Run(t, new(MessageIntegrationTestSuite))
}
