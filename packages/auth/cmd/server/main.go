package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"auth/internal/config"
	"auth/internal/handler"
	"auth/internal/middleware"
	"auth/internal/repository"
	"auth/internal/service"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Load configuration
	cfg := config.Load()

	// Initialize Redis client
	redisClient := config.NewRedisClient(cfg)
	defer redisClient.Close()

	// Initialize repositories
	authRepo := repository.NewAuthRepository(redisClient)

	// Initialize services
	authService := service.NewAuthService(authRepo, cfg)

	// Initialize Gin router
	r := gin.Default()

	// Middleware
	r.Use(middleware.CORS())
	r.Use(middleware.ErrorHandler())

	// Health check
	r.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// API routes
	v1 := r.Group("/api/v1")
	{
		auth := v1.Group("/auth")
		{
			authHandler := handler.NewAuthHandler(authService)

			// Social login routes
			auth.POST("/login/:provider", authHandler.SocialLogin)
			auth.POST("/login/:provider/native", authHandler.SocialLoginNative)

			// Token management
			auth.POST("/tokens/refresh", authHandler.RefreshToken)
			auth.POST("/tokens/verify", authHandler.VerifyToken)
			auth.DELETE("/tokens", middleware.AuthMiddleware(cfg.JWTSecret), authHandler.Logout)
		}

		// Internal API routes (for inter-service communication)
		internal := v1.Group("/internal")
		internal.Use(middleware.InternalAPIMiddleware(cfg.InternalAPIKey))
		{
			internalHandler := handler.NewInternalHandler(authService)
			internal.POST("/users/:userId/mapping", internalHandler.SetUserMapping)
			internal.GET("/users/:userId", internalHandler.GetUser)
		}
	}

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Starting auth server on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
