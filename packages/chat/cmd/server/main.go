package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"gaegaeting/chat/internal/infrastructure/config"
	"gaegaeting/chat/internal/infrastructure/adapter/inbound/router"
	"gaegaeting/chat/internal/infrastructure/adapter/outbound/kafka"
	"gaegaeting/chat/internal/infrastructure/adapter/outbound/redis"
	"gaegaeting/chat/internal/infrastructure/adapter/outbound/repository"
	"gaegaeting/chat/internal/application/service"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	// Initialize infrastructure
	db, err := repository.NewDatabase(cfg.Database)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	redisClient := redis.NewClient(cfg.Redis)
	kafkaProducer := kafka.NewProducer(cfg.Kafka)
	defer kafkaProducer.Close()

	// Initialize repositories
	messageRepo := repository.NewMessageRepository(db)
	roomRepo := repository.NewRoomRepository(db)

	// Initialize services
	messageService := service.NewMessageService(messageRepo, kafkaProducer, redisClient)
	roomService := service.NewRoomService(roomRepo, kafkaProducer, redisClient)

	// Setup HTTP server
	r := router.SetupRouter(cfg, messageService, roomService)
	
	srv := &http.Server{
		Addr:    fmt.Sprintf(":%d", cfg.Server.Port),
		Handler: r,
	}

	// Start server in goroutine
	go func() {
		log.Printf("Starting chat service on port %d", cfg.Server.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal to gracefully shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}
