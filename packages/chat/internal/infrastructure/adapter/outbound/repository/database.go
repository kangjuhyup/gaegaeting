package repository

import (
	"gaegaeting/chat/internal/domain/message"
	"gaegaeting/chat/internal/domain/room"
	"gaegaeting/chat/internal/infrastructure/config"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func NewDatabase(cfg config.DatabaseConfig) (*gorm.DB, error) {
	db, err := gorm.Open(mysql.Open(cfg.DSN()), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, err
	}

	// Auto migrate
	if err := db.AutoMigrate(&room.Room{}, &message.Message{}); err != nil {
		return nil, err
	}

	return db, nil
}
