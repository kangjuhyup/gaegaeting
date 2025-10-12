package config

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
)

type Config struct {
	// Server
	Port            string
	Environment     string
	InternalAPIKey  string

	// JWT
	JWTSecret            string
	AccessTokenDuration  time.Duration
	RefreshTokenDuration time.Duration

	// Redis
	RedisHost     string
	RedisPort     string
	RedisPassword string
	RedisDB       int

	// Social OAuth
	GoogleClientID     string
	GoogleClientSecret string
	KakaoClientID      string
	KakaoClientSecret  string
	NaverClientID      string
	NaverClientSecret  string
}

func Load() *Config {
	return &Config{
		Port:            getEnv("PORT", "8080"),
		Environment:     getEnv("ENVIRONMENT", "development"),
		InternalAPIKey:  getEnv("INTERNAL_API_KEY", ""),

		JWTSecret:            getEnv("JWT_SECRET", "your-secret-key"),
		AccessTokenDuration:  parseDuration(getEnv("ACCESS_TOKEN_DURATION", "15m")),
		RefreshTokenDuration: parseDuration(getEnv("REFRESH_TOKEN_DURATION", "7d")),

		RedisHost:     getEnv("REDIS_HOST", "localhost"),
		RedisPort:     getEnv("REDIS_PORT", "6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisDB:       0,

		GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
		KakaoClientID:      getEnv("KAKAO_CLIENT_ID", ""),
		KakaoClientSecret:  getEnv("KAKAO_CLIENT_SECRET", ""),
		NaverClientID:      getEnv("NAVER_CLIENT_ID", ""),
		NaverClientSecret:  getEnv("NAVER_CLIENT_SECRET", ""),
	}
}

func NewRedisClient(cfg *Config) *redis.Client {
	client := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisHost + ":" + cfg.RedisPort,
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}

	log.Println("Connected to Redis successfully")
	return client
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func parseDuration(s string) time.Duration {
	d, err := time.ParseDuration(s)
	if err != nil {
		log.Printf("Failed to parse duration %s, using default", s)
		return 15 * time.Minute
	}
	return d
}
