.PHONY: test test-unit test-integration test-coverage build run clean dev dev-doppler

# Doppler로 개발 서버 실행 (추천)
dev-doppler:
	doppler run -- go run ./cmd/server/main.go

# .env 파일로 개발 서버 실행 (백업용)
dev:
	go run ./cmd/server/main.go

# 모든 테스트 실행
test:
	go test -v ./...

# 유닛 테스트만 실행
test-unit:
	go test -v -short ./...

# 통합 테스트 실행 (DB, Redis, Kafka 필요)
test-integration:
	go test -v -tags=integration ./...

# 테스트 커버리지 확인
test-coverage:
	go test -v -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report generated: coverage.html"

# 특정 패키지 테스트
test-domain:
	go test -v ./internal/domain/...

test-service:
	go test -v ./internal/application/service/...

test-handler:
	go test -v ./internal/infrastructure/adapter/inbound/handler/...

# 빌드
build:
	go build -o chat-service ./cmd/server

# 실행
run:
	go run ./cmd/server/main.go

# 클린
clean:
	rm -f chat-service coverage.out coverage.html
	go clean -testcache

# 의존성 설치
deps:
	go mod download
	go mod tidy

# 린트
lint:
	golangci-lint run

# 벤치마크
bench:
	go test -bench=. -benchmem ./...

# 도움말
help:
	@echo "Available targets:"
	@echo "  test              - Run all tests"
	@echo "  test-unit         - Run unit tests only"
	@echo "  test-integration  - Run integration tests"
	@echo "  test-coverage     - Generate test coverage report"
	@echo "  test-domain       - Test domain layer"
	@echo "  test-service      - Test service layer"
	@echo "  test-handler      - Test handler layer"
	@echo "  build             - Build the application"
	@echo "  run               - Run the application"
	@echo "  clean             - Clean build artifacts"
	@echo "  deps              - Download dependencies"
	@echo "  lint              - Run linter"
	@echo "  bench             - Run benchmarks"
