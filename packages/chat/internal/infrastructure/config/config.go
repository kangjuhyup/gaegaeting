package config

import (
	"fmt"
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Redis    RedisConfig
	Kafka    KafkaConfig
	JWT      JWTConfig
}

type ServerConfig struct {
	Port int
	Env  string
}

type DatabaseConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	Database string
}

type RedisConfig struct {
	Host     string
	Port     int
	Password string
	DB       int
}

type KafkaConfig struct {
	Brokers []string
	GroupID string
}

type JWTConfig struct {
	Secret string
}

func Load() (*Config, error) {
	// Load .env file if exists (Doppler 없을 때 백업용)
	// Doppler 사용 시 이 파일은 무시됨
	_ = godotenv.Load()

	// 환경 변수 로드 (기본값: production으로 변경)
	env := getEnv("NODE_ENV", "production")

	// 개발/프로덕션 모드 로깅
	if env == "development" {
		log.Println("⚠️  Running in DEVELOPMENT mode")
		log.Println("💡 Use 'doppler run -- go run cmd/server/main.go' for Doppler integration")
	} else {
		log.Println("✅ Running in PRODUCTION mode")
	}

	serverPort, _ := strconv.Atoi(getEnv("CHAT_PORT", "3003"))
	dbPort, _ := strconv.Atoi(getEnv("DB_PORT", "3306"))
	redisPort, _ := strconv.Atoi(getEnv("REDIS_PORT", "6379"))
	redisDB, _ := strconv.Atoi(getEnv("REDIS_DB", "0"))

	// JWT Secret 검증 (프로덕션)
	jwtSecret := getEnv("JWT_SECRET", "")
	if env == "production" && (jwtSecret == "" || jwtSecret == "your-secret-key" || jwtSecret == "your-secret-key-change-this-in-production") {
		log.Fatal("❌ FATAL: JWT_SECRET must be set to a strong value in production environment!")
	}
	if jwtSecret == "" {
		jwtSecret = "dev-only-secret"
		log.Println("⚠️  WARNING: Using default JWT secret (development only)")
	}

	return &Config{
		Server: ServerConfig{
			Port: serverPort,
			Env:  env,
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     dbPort,
			User:     getEnv("DB_USER", "root"),
			Password: getEnv("DB_PASSWORD", ""),
			Database: getEnv("DB_NAME", "gaegaeting"),
		},
		Redis: RedisConfig{
			Host:     getEnv("REDIS_HOST", "localhost"),
			Port:     redisPort,
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       redisDB,
		},
		Kafka: KafkaConfig{
			Brokers: []string{getEnv("KAFKA_BROKER", "localhost:9092")},
			GroupID: getEnv("KAFKA_GROUP_ID", "chat-service"),
		},
		JWT: JWTConfig{
			Secret: jwtSecret,
		},
	}, nil
}

func (c *DatabaseConfig) DSN() string {
	return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		c.User, c.Password, c.Host, c.Port, c.Database)
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
