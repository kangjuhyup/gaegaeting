package router

import (
	"gaegaeting/chat/internal/application/port"
	"gaegaeting/chat/internal/infrastructure/adapter/inbound/handler"
	"gaegaeting/chat/internal/infrastructure/adapter/inbound/middleware"
	"gaegaeting/chat/internal/infrastructure/config"

	"github.com/gin-gonic/gin"
)

func SetupRouter(
	cfg *config.Config,
	messageService port.MessageService,
	roomService port.RoomService,
) *gin.Engine {
	if cfg.Server.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.Default()

	// Middleware
	r.Use(middleware.CORS())
	r.Use(middleware.RequestLogger())

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// API routes
	api := r.Group("/api/v1")
	{
		// Auth middleware (x-user-info injected by Traefik)
		authMiddleware := middleware.UserInfoAuth()

		// Room endpoints
		rooms := api.Group("/rooms")
		rooms.Use(authMiddleware)
		{
			roomHandler := handler.NewRoomHandler(roomService)
			rooms.POST("", roomHandler.CreateRoom)
			rooms.GET("", roomHandler.GetUserRooms)
			rooms.GET("/:roomId", roomHandler.GetRoom)
			rooms.PATCH("/:roomId/status", roomHandler.UpdateRoomStatus)
		}

		// Message endpoints
		messages := api.Group("/messages")
		messages.Use(authMiddleware)
		{
			messageHandler := handler.NewMessageHandler(messageService)
			messages.POST("", messageHandler.SendMessage)
			messages.GET("/room/:roomId", messageHandler.GetMessages)
			messages.PATCH("/:messageId/read", messageHandler.MarkAsRead)
			messages.GET("/room/:roomId/unread-count", messageHandler.GetUnreadCount)
		}

		// WebSocket endpoint
		ws := api.Group("/ws")
		ws.Use(authMiddleware)
		{
			wsHandler := handler.NewWebSocketHandler(messageService, roomService)
			ws.GET("/chat/:roomId", wsHandler.HandleWebSocket)
		}
	}

	return r
}
