package service

import (
	"context"
	"fmt"
	"time"

	"auth/internal/config"
	"auth/internal/model"
	"auth/internal/repository"
	"auth/pkg/jwt"
)

type AuthService interface {
	// Social login
	SocialLogin(ctx context.Context, provider model.SocialProvider, code, redirectURI, codeVerifier string) (*model.TokenPair, error)
	SocialLoginNative(ctx context.Context, provider model.SocialProvider, accessToken string) (*model.TokenPair, error)

	// Token management
	RefreshToken(ctx context.Context, refreshToken string) (*model.TokenPair, error)
	VerifyToken(ctx context.Context, token string) (*model.TokenClaims, error)
	Logout(ctx context.Context, userID string) error

	// Internal API
	SetUserMapping(ctx context.Context, userID string, providerType int, providerID string) error
	GetAuthProvider(ctx context.Context, providerType int, providerID string) (*model.AuthProvider, error)
}

type authService struct {
	repo      repository.AuthRepository
	cfg       *config.Config
	jwtHelper *jwt.Helper
}

func NewAuthService(repo repository.AuthRepository, cfg *config.Config) AuthService {
	return &authService{
		repo:      repo,
		cfg:       cfg,
		jwtHelper: jwt.NewHelper(cfg.JWTSecret),
	}
}

func (s *authService) SocialLogin(ctx context.Context, provider model.SocialProvider, code, redirectURI, codeVerifier string) (*model.TokenPair, error) {
	// TODO: Implement OAuth flow with social providers
	// 1. Exchange code for access token
	// 2. Get user info from provider
	// 3. Check if provider exists in DB
	// 4. Generate JWT tokens

	// Placeholder implementation
	return nil, fmt.Errorf("not implemented")
}

func (s *authService) SocialLoginNative(ctx context.Context, provider model.SocialProvider, accessToken string) (*model.TokenPair, error) {
	// TODO: Implement native social login
	// 1. Verify access token with social provider
	// 2. Get user info from provider
	// 3. Check if provider exists in DB
	// 4. Generate JWT tokens

	// Placeholder implementation
	userInfo, err := s.getSocialUserInfo(provider, accessToken)
	if err != nil {
		return nil, fmt.Errorf("failed to get user info: %w", err)
	}

	// Get or create auth provider
	authProvider, err := s.repo.GetAuthProvider(ctx, provider, userInfo.ProviderID)
	if err != nil {
		return nil, err
	}

	if authProvider == nil {
		// First time login - create new auth provider
		authProvider = &model.AuthProvider{
			Provider:   provider,
			ProviderID: userInfo.ProviderID,
			UserID:     nil, // User ID will be set later by account service
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		}
		if err := s.repo.SaveAuthProvider(ctx, authProvider); err != nil {
			return nil, err
		}
	}

	// Generate tokens
	return s.generateTokenPair(ctx, authProvider)
}

func (s *authService) RefreshToken(ctx context.Context, refreshToken string) (*model.TokenPair, error) {
	// Verify refresh token
	claims, err := s.jwtHelper.VerifyToken(refreshToken)
	if err != nil {
		return nil, fmt.Errorf("invalid refresh token: %w", err)
	}

	if claims.Type != "refresh" {
		return nil, fmt.Errorf("invalid token type")
	}

	// Check if refresh token is valid in Redis
	if claims.UserID != "" {
		valid, err := s.repo.IsRefreshTokenValid(ctx, claims.UserID, refreshToken)
		if err != nil {
			return nil, err
		}
		if !valid {
			return nil, fmt.Errorf("refresh token not found or expired")
		}
	}

	// Get auth provider
	authProvider, err := s.repo.GetAuthProvider(ctx, claims.Provider, claims.ProviderID)
	if err != nil {
		return nil, err
	}
	if authProvider == nil {
		return nil, fmt.Errorf("auth provider not found")
	}

	// Generate new token pair
	return s.generateTokenPair(ctx, authProvider)
}

func (s *authService) VerifyToken(ctx context.Context, token string) (*model.TokenClaims, error) {
	return s.jwtHelper.VerifyToken(token)
}

func (s *authService) Logout(ctx context.Context, userID string) error {
	return s.repo.DeleteRefreshToken(ctx, userID)
}

func (s *authService) SetUserMapping(ctx context.Context, userID string, providerType int, providerID string) error {
	provider := model.SocialProvider(providerType)
	return s.repo.UpdateUserMapping(ctx, provider, providerID, userID)
}

func (s *authService) GetAuthProvider(ctx context.Context, providerType int, providerID string) (*model.AuthProvider, error) {
	provider := model.SocialProvider(providerType)
	return s.repo.GetAuthProvider(ctx, provider, providerID)
}

func (s *authService) generateTokenPair(ctx context.Context, provider *model.AuthProvider) (*model.TokenPair, error) {
	claims := &model.TokenClaims{
		Provider:   provider.Provider,
		ProviderID: provider.ProviderID,
	}

	if provider.UserID != nil {
		claims.UserID = *provider.UserID
	}

	// Generate access token
	accessToken, err := s.jwtHelper.GenerateToken(claims, "access", s.cfg.AccessTokenDuration)
	if err != nil {
		return nil, err
	}

	// Generate refresh token
	refreshToken, err := s.jwtHelper.GenerateToken(claims, "refresh", s.cfg.RefreshTokenDuration)
	if err != nil {
		return nil, err
	}

	// Save refresh token in Redis
	if provider.UserID != nil {
		if err := s.repo.SaveRefreshToken(ctx, *provider.UserID, refreshToken, s.cfg.RefreshTokenDuration); err != nil {
			return nil, err
		}
	}

	return &model.TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(s.cfg.AccessTokenDuration.Seconds()),
	}, nil
}

func (s *authService) getSocialUserInfo(provider model.SocialProvider, accessToken string) (*model.SocialUserInfo, error) {
	// TODO: Implement actual social provider API calls
	switch provider {
	case model.ProviderGoogle:
		return s.getGoogleUserInfo(accessToken)
	case model.ProviderKakao:
		return s.getKakaoUserInfo(accessToken)
	case model.ProviderNaver:
		return s.getNaverUserInfo(accessToken)
	default:
		return nil, fmt.Errorf("unsupported provider")
	}
}

func (s *authService) getGoogleUserInfo(accessToken string) (*model.SocialUserInfo, error) {
	// TODO: Implement Google userinfo API call
	return nil, fmt.Errorf("not implemented")
}

func (s *authService) getKakaoUserInfo(accessToken string) (*model.SocialUserInfo, error) {
	// TODO: Implement Kakao userinfo API call
	return nil, fmt.Errorf("not implemented")
}

func (s *authService) getNaverUserInfo(accessToken string) (*model.SocialUserInfo, error) {
	// TODO: Implement Naver userinfo API call
	return nil, fmt.Errorf("not implemented")
}
