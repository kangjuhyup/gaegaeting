package repository

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"auth/internal/model"
	"github.com/redis/go-redis/v9"
)

type AuthRepository interface {
	SaveAuthProvider(ctx context.Context, provider *model.AuthProvider) error
	GetAuthProvider(ctx context.Context, providerType model.SocialProvider, providerID string) (*model.AuthProvider, error)
	UpdateUserMapping(ctx context.Context, providerType model.SocialProvider, providerID, userID string) error
	SaveRefreshToken(ctx context.Context, userID, token string, duration time.Duration) error
	GetRefreshToken(ctx context.Context, userID string) (string, error)
	DeleteRefreshToken(ctx context.Context, userID string) error
	IsRefreshTokenValid(ctx context.Context, userID, token string) (bool, error)
}

type authRepository struct {
	client *redis.Client
}

func NewAuthRepository(client *redis.Client) AuthRepository {
	return &authRepository{client: client}
}

func (r *authRepository) SaveAuthProvider(ctx context.Context, provider *model.AuthProvider) error {
	key := r.getAuthProviderKey(provider.Provider, provider.ProviderID)
	data, err := json.Marshal(provider)
	if err != nil {
		return err
	}
	return r.client.Set(ctx, key, data, 0).Err()
}

func (r *authRepository) GetAuthProvider(ctx context.Context, providerType model.SocialProvider, providerID string) (*model.AuthProvider, error) {
	key := r.getAuthProviderKey(providerType, providerID)
	data, err := r.client.Get(ctx, key).Result()
	if err == redis.Nil {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	var provider model.AuthProvider
	if err := json.Unmarshal([]byte(data), &provider); err != nil {
		return nil, err
	}
	return &provider, nil
}

func (r *authRepository) UpdateUserMapping(ctx context.Context, providerType model.SocialProvider, providerID, userID string) error {
	provider, err := r.GetAuthProvider(ctx, providerType, providerID)
	if err != nil {
		return err
	}
	if provider == nil {
		return fmt.Errorf("auth provider not found")
	}

	provider.UserID = &userID
	provider.UpdatedAt = time.Now()
	return r.SaveAuthProvider(ctx, provider)
}

func (r *authRepository) SaveRefreshToken(ctx context.Context, userID, token string, duration time.Duration) error {
	key := r.getRefreshTokenKey(userID)
	return r.client.Set(ctx, key, token, duration).Err()
}

func (r *authRepository) GetRefreshToken(ctx context.Context, userID string) (string, error) {
	key := r.getRefreshTokenKey(userID)
	return r.client.Get(ctx, key).Result()
}

func (r *authRepository) DeleteRefreshToken(ctx context.Context, userID string) error {
	key := r.getRefreshTokenKey(userID)
	return r.client.Del(ctx, key).Err()
}

func (r *authRepository) IsRefreshTokenValid(ctx context.Context, userID, token string) (bool, error) {
	storedToken, err := r.GetRefreshToken(ctx, userID)
	if err == redis.Nil {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return storedToken == token, nil
}

func (r *authRepository) getAuthProviderKey(providerType model.SocialProvider, providerID string) string {
	return fmt.Sprintf("auth:provider:%d:%s", providerType, providerID)
}

func (r *authRepository) getRefreshTokenKey(userID string) string {
	return fmt.Sprintf("auth:refresh:%s", userID)
}
